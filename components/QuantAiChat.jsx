"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

function renderFormattedMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");

  return lines.map((line, lIdx) => {
    const trimmed = line.trim();

    // Headers like **1. The "Fee" is Bigger Than the "Prize"**
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
      const headerText = trimmed.slice(2, -2);
      return (
        <div
          key={lIdx}
          style={{
            fontWeight: 800,
            fontSize: "0.98rem",
            color: "var(--ink)",
            marginTop: lIdx === 0 ? 0 : 12,
            marginBottom: 4,
          }}
        >
          {headerText}
        </div>
      );
    }

    // Bullet points: * or -
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const bulletContent = trimmed.slice(2);
      return (
        <div
          key={lIdx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginLeft: 6,
            marginBottom: 4,
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "#e5252a", fontWeight: 900, lineHeight: 1.2 }}>•</span>
          <div>{renderInlineFormatting(bulletContent)}</div>
        </div>
      );
    }

    // Empty lines
    if (!trimmed) {
      return <div key={lIdx} style={{ height: 6 }} />;
    }

    // Regular paragraphs
    return (
      <div key={lIdx} style={{ marginBottom: 5, fontSize: "0.9rem", lineHeight: 1.55 }}>
        {renderInlineFormatting(line)}
      </div>
    );
  });
}

function renderInlineFormatting(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={pIdx} style={{ fontWeight: 800, color: "var(--ink)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function QuantAiChat({ caseData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopover, setShowPopover] = useState(true);
  const [messages, setMessages] = useState(() => {
    if (!caseData) {
      return [
        {
          role: "assistant",
          content: "**SpreadForge AI Assistant Ready.**\nLoad the MCX benchmark case or upload your custom contract dataset to analyze relative value spread anomalies with AI.",
        },
      ];
    }
    const shift = caseData.total_change != null ? `${caseData.total_change} bps` : "-14.9 bps";
    const net = caseData.validation?.net_pnl != null ? `₹${caseData.validation.net_pnl.toLocaleString("en-IN")}` : "-₹2,866";
    const pVal = caseData.validation?.p_value != null ? `p = ${caseData.validation.p_value}` : "p = 0.22";
    const topLeg = caseData.causes?.[0]?.segment || "GOLDM Leg";
    const topShare = caseData.causes?.[0]?.share_pct || 47.5;
    const verdict = caseData.validation?.verdict || "NO EDGE AFTER COSTS";

    return [
      {
        role: "assistant",
        content: `**Case Audit Ready:**\n* **Spread Shift:** ${shift} (7-day before avg: ${caseData.before_avg || 53.7} bps → after avg: ${caseData.after_avg || 38.8} bps)\n* **Primary Leg:** ${topLeg} (${topShare}% share of divergence)\n* **Official Verdict:** **${verdict}**\n* **Realized Net P&L:** ${net}\n* **Monte Carlo Shuffle:** ${pVal}\n\nAsk any question below to interrogate the contract legs, purity normalization (995 vs 999), or exchange cost friction.`,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const chipsScrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Hide popover automatically after 9 seconds or when opened
  useEffect(() => {
    const timer = setTimeout(() => setShowPopover(false), 9000);
    return () => clearTimeout(timer);
  }, []);

  function handleOpen() {
    setIsOpen((prev) => !prev);
    setShowPopover(false);
  }

  function scrollChips(direction) {
    if (chipsScrollRef.current) {
      chipsScrollRef.current.scrollBy({
        left: direction === "left" ? -140 : 140,
        behavior: "smooth",
      });
    }
  }

  async function handleSend(textToSend) {
    const q = textToSend || input.trim();
    if (!q || loading) return;

    const userMsg = { role: "user", content: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const placeholderMsg = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, placeholderMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          caseData,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `**⚠️ System Notice:** ${errJson.error || "Unable to reach Groq AI model."}`,
          };
          return copy;
        });
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let accumulated = "";
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json?.choices?.[0]?.delta?.content || "";
                if (delta) {
                  accumulated += delta;
                  setMessages((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                    };
                    return copy;
                  });
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "**⚠️ Network connection failed:** Unable to complete streaming interrogation.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  const promptChips = [
    "Why did I lose money on this trade?",
    "Explain the ₹500 note vs ₹750 fee analogy",
    "What does Monte Carlo p = 0.22 mean?",
    "How does 995 vs 999 purity math work?",
    "Why is GOLDGUINEA 8g retail so tricky?",
  ];

  return (
    <>
      {/* Floating launcher trigger + Attention Popover */}
      <div
        className="quant-chat-floating"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        {/* Animated Popover Callout */}
        <AnimatePresence>
          {showPopover && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                marginBottom: 10,
                background: "#0d1114",
                color: "#f8fafc",
                border: "2px solid #e5252a",
                borderRadius: 10,
                padding: "8px 14px",
                boxShadow: "0 10px 25px rgba(229, 37, 42, 0.35)",
                fontSize: "0.84rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                maxWidth: 240,
              }}
              onClick={handleOpen}
            >
              <span>💡</span>
              <span>Need help? Click here to <b>Explain with AI</b></span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopover(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 13,
                  marginLeft: 4,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger Button: Explain with AI */}
        <motion.button
          type="button"
          onClick={handleOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Explain with AI"
          style={{
            background: "#e5252a",
            color: "#ffffff",
            border: "2px solid #ffffff",
            borderRadius: "50px",
            padding: "11px 18px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "0.88rem",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          <span>Explain with AI</span>
          {isOpen ? (
            <span style={{ fontSize: 13, opacity: 0.8 }}>✕</span>
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
          )}
        </motion.button>
      </div>

      {/* Floating Chat Modal (Responsively bound for desktop and phone screens) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="quant-chat-modal"
            style={{
              position: "fixed",
              bottom: 80,
              right: 20,
              width: 520,
              maxWidth: "calc(100vw - 28px)",
              height: 600,
              maxHeight: "calc(100vh - 96px)",
              zIndex: 9999,
              background: "var(--paper, #121820)",
              border: "1px solid var(--grid, #2a3544)",
              borderRadius: 16,
              boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--grid, #2a3544)",
                background: "rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#e5252a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  ⚡
                </div>
                <div>
                  <div className="display" style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)" }}>
                    Explain with AI
                  </div>
                  <div className="type small" style={{ fontSize: "0.75rem", color: "var(--muted)", letterSpacing: "0.04em" }}>
                    GROQ LLAMA / QWEN COMMODITIES FORENSIC AGENT
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Transcript Messages Container */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px 20px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    background: m.role === "user" ? "#e5252a" : "var(--card, #1a222d)",
                    color: m.role === "user" ? "#ffffff" : "var(--ink, #f1f5f9)",
                    padding: "14px 18px",
                    borderRadius: m.role === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    border: m.role === "user" ? "none" : "1px solid var(--grid, #2a3544)",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      opacity: m.role === "user" ? 0.85 : 0.65,
                      color: m.role === "user" ? "#ffffff" : "var(--muted)",
                    }}
                  >
                    {m.role === "user" ? "You" : "Explain with AI"}
                  </div>
                  <div>
                    {m.role === "user" ? m.content : renderFormattedMarkdown(m.content)}
                  </div>
                </div>
              ))}

              {loading && !messages[messages.length - 1]?.content && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    background: "var(--card, #1a222d)",
                    color: "var(--muted)",
                    padding: "10px 16px",
                    borderRadius: "16px 16px 16px 2px",
                    fontSize: "0.86rem",
                    border: "1px solid var(--grid, #2a3544)",
                  }}
                >
                  Analyzing evidence and preparing breakdown...
                </div>
              )}
            </div>

            {/* Quick Prompts with Scroll Buttons & Hidden Scrollbar */}
            <div
              style={{
                position: "relative",
                padding: "8px 12px",
                borderTop: "1px solid var(--grid, #2a3544)",
                background: "rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() => scrollChips("left")}
                aria-label="Scroll options left"
                style={{
                  background: "var(--card, #1a222d)",
                  border: "1px solid var(--grid, #2a3544)",
                  color: "var(--ink)",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                ◀
              </button>

              <div
                ref={chipsScrollRef}
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  scrollbarWidth: "none", // Firefox
                  msOverflowStyle: "none", // IE
                  flex: 1,
                }}
                className="hide-scrollbar"
              >
                {promptChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      whiteSpace: "nowrap",
                      background: "var(--card, #1a222d)",
                      color: "var(--ink)",
                      border: "1px solid var(--grid, #2a3544)",
                      flexShrink: 0,
                    }}
                    onClick={() => handleSend(chip)}
                    disabled={loading}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollChips("right")}
                aria-label="Scroll options right"
                style={{
                  background: "var(--card, #1a222d)",
                  border: "1px solid var(--grid, #2a3544)",
                  color: "var(--ink)",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                ▶
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: "12px 18px",
                borderTop: "1px solid var(--grid, #2a3544)",
                display: "flex",
                gap: 10,
                background: "rgba(0,0,0,0.12)",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this case, costs, or spread math..."
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--grid, #2a3544)",
                  background: "var(--card, #1a222d)",
                  color: "var(--ink, #ffffff)",
                  fontSize: "0.92rem",
                  outline: "none",
                }}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-red btn-sm"
                disabled={loading || !input.trim()}
                style={{ padding: "0 18px", fontWeight: 800, fontSize: "0.88rem" }}
              >
                {loading ? "..." : "Send"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
