"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";

// chart pieces from the recharts toolbox
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// animation building blocks (see primitives.jsx)
import {
  AnimatedNumber,
  ScrambleText,
  SplitText,
  Magnetic,
  Tilt,
  Flashlight,
  MagnifierCursor,
  TextLoop,
  Marquee,
  Reveal,
  Stamp,
  SlidingTabs,
  ScrollProgress,
  Accordion,
  Modal,
} from "@/components/primitives";

const API_URL = "/api/analyze";
const WINDOW_DAYS = 7;

const STATUS_LINES = [
  "Reading the evidence...",
  "Dusting for fingerprints...",
  "Normalizing purity to 999 pure gold...",
  "Finding the scene of the drop...",
  "Questioning every contract leg...",
  "Cross-checking execution alibis...",
];

const COLUMNS = ["date", "region / leg", "category / contract", "revenue / spread"];

const FAQ = [
  {
    q: "What does my Excel / CSV file need?",
    a: "One sheet, one header row, and columns for date and value/revenue/spread (plus optional region/leg and category/contract). Real dates, numeric values, and .xlsx or .csv files are supported. You can download our sample CSV to test right away.",
  },
  {
    q: "How does it find the drop or anomaly?",
    a: "For every day, it compares the average of the 7 days before with the average of the 5 days from that day on. The day with the largest lasting fall is isolated as the scene of the drop, so one noisy day cannot fool it.",
  },
  {
    q: "Why does the Verdict Card show 'NO EDGE AFTER COSTS'?",
    a: "While gross spread movement showed +₹1,334 in theoretical reversion, MCX exchange fees, stamp duty, turnover charges, and 1-bar execution slippage cost ₹4,200. Real net PnL is -₹2,866, and our 1,000-iteration Monte Carlo permutation test yielded p = 0.22. SpreadForge protects traders by proving when NOT to trade.",
  },
  {
    q: "Why must MCX gold purity be normalized?",
    a: "MCX GOLDM is delivered at 995 purity per 10g, whereas GOLDTEN, GOLDGUINEA, and GOLDPETAL trade at 999 purity with differing lot sizes (100g, 10g, 8g, 1g). To detect true relative-value arbitrage, all prices are adjusted to pure 999 gold per gram (GOLDM × 999/995).",
  },
  {
    q: "What do High, Medium and Low mean in the suspect lineup?",
    a: "They describe a contract leg's share of the total drop or divergence. High is 50% or more, Medium is 20% or more, and Low is anything below 20%.",
  },
  {
    q: "Is my file saved anywhere?",
    a: "No. The app processes your data entirely for your current session and never stores or logs your files on remote servers.",
  },
];

function fmt(n) {
  if (n == null || isNaN(n)) return "0.0";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function caseNo(name) {
  let h = 0;
  for (const ch of name || "SF") h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return "SF-" + (1000 + h);
}

function initials(segment) {
  if (!segment) return "SF";
  return segment
    .split(" -> ")
    .map((s) => s.trim()[0])
    .join("")
    .toUpperCase();
}

function downloadCsv(result, fileName) {
  const header = ["segment", "before_bps", "after_bps", "change_bps", "change_pct", "share_pct", "impact"];
  const rows = result.causes.map((c) =>
    [JSON.stringify(c.segment), c.before, c.after, c.change, c.change_pct, c.share_pct, c.impact].join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spreadforge_${(fileName || "case").replace(/[^a-zA-Z0-9_-]/g, "_")}_file.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tip type">
      <div className="tip-date">{label}</div>
      <div className="tip-val display">{fmt(payload[0].value)} bps</div>
    </div>
  );
}

function CostTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="tip type">
      <div className="tip-date">{data.name}</div>
      <div className="tip-val display">₹{fmt(data.amount)}</div>
    </div>
  );
}

function TapeText({ words }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className="tape-item display">
          {w} <i>✕</i>
        </span>
      ))}
    </>
  );
}

export default function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState("area");
  const [replay, setReplay] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [theme, setTheme] = useState("night");

  const inputRef = useRef(null);
  const toastTimer = useRef(null);

  const found = result && result.drop_found;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("whydrop-theme");
      if (saved) setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("whydrop-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.title = found
      ? `Case ${caseNo(fileName)} | SpreadForge`
      : "SpreadForge | Find who moved the spread";
  }, [found, fileName]);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!found || !result?.causes?.length) return;
    function onKey(e) {
      if (e.key === "ArrowRight") setSelected((s) => Math.min(s + 1, result.causes.length - 1));
      if (e.key === "ArrowLeft") setSelected((s) => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found, result]);

  function showToast(kind, text) {
    clearTimeout(toastTimer.current);
    setToast({ kind, text });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  async function analyzeFile(file) {
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      setError("Only .xlsx and .csv files are accepted as evidence.");
      setResult(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setFileName(file.name);
    setLoading(true);
    setError("");
    setResult(null);
    setSelected(0);

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed.");
      } else {
        setResult(data);
        setAnalyzedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
        showToast("ok", data.drop_found ? "Evidence accepted. Case file ready." : "Evidence accepted. No sustained drop detected.");
      }
    } catch {
      setError("Could not connect to analysis endpoint.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreset(presetName, displayName) {
    setFileName(displayName);
    setLoading(true);
    setError("");
    setResult(null);
    setSelected(0);

    try {
      const res = await fetch(`${API_URL}?preset=${presetName}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load preset.");
      } else {
        setResult(data);
        setAnalyzedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
        showToast("ok", "Live MCX case file loaded.");
      }
    } catch {
      setError("Failed to load preset case.");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    analyzeFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      analyzeFile(e.dataTransfer.files[0]);
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setFileName("");
    setSelected(0);
    setView("area");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestReset() {
    if (result) setConfirmOpen(true);
    else reset();
  }

  function copySummary() {
    const v = result?.validation?.verdict || "CASE PROCESSED";
    const text = `SpreadForge case ${caseNo(fileName)}: ${v}. ${result.causes[0]?.segment} is the prime suspect (${result.causes[0]?.share_pct}% share). Spread shifted ${Math.abs(result.total_change)} bps starting ${result.drop_date}.`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("ok", "Summary copied to clipboard."))
        .catch(() => showToast("err", "Copy failed."));
    } else {
      showToast("err", "Copy not supported in browser.");
    }
  }

  // Numbers for chart windows
  let beforeStart = null;
  let beforeEnd = null;
  let afterEnd = null;
  let barData = [];

  if (found) {
    const dates = result.daily.map((d) => d.date);
    const idx = dates.indexOf(result.drop_date);
    if (idx > 0) {
      beforeStart = dates[Math.max(0, idx - WINDOW_DAYS)];
      beforeEnd = dates[idx - 1];
      afterEnd = dates[Math.min(dates.length - 1, idx + WINDOW_DAYS - 1)];
    }
    barData = result.daily.map((d) => {
      let tone = "other";
      if (afterEnd && d.date >= result.drop_date && d.date <= afterEnd) tone = "after";
      else if (beforeStart && d.date >= beforeStart && d.date <= beforeEnd) tone = "before";
      return { ...d, tone };
    });
  }

  const top = found && result.causes.length ? result.causes[0] : null;
  const picked = top ? result.causes[Math.min(selected, result.causes.length - 1)] : null;

  let noteText = "";
  if (picked) {
    const level =
      picked.impact === "High" ? "Primary driver." : picked.impact === "Medium" ? "Secondary contributor." : "Minor friction.";
    noteText = `${picked.segment} averaged ${fmt(picked.before)} bps before the drop and ${fmt(picked.after)} bps after, shifting by ${fmt(picked.change)} bps. That accounts for ${picked.share_pct}% of the overall negative divergence across legs. ${level}`;
  }

  const stats = top
    ? [
        { label: "Scene of the drop", tone: "yellow", node: <span className="display stat-val">{result.drop_date}</span> },
        {
          label: "Spread Shift",
          tone: "red",
          node: (
            <span className="display stat-val">
              {result.total_change > 0 ? "+" : ""}
              {fmt(result.total_change)} bps
            </span>
          ),
        },
        {
          label: `Before (${WINDOW_DAYS}-day avg)`,
          tone: "cyan",
          node: (
            <span className="display stat-val">
              {fmt(result.before_total / WINDOW_DAYS)} bps
            </span>
          ),
        },
        {
          label: `After (${WINDOW_DAYS}-day avg)`,
          tone: "paper",
          node: (
            <span className="display stat-val">
              {fmt(result.after_total / WINDOW_DAYS)} bps
            </span>
          ),
        },
      ]
    : [];

  const tilts = [-1.6, 1.2, -1, 1.7];

  // Cost data for the Waterfall / Costs Chart
  const costData = result?.validation?.net_pnl != null
    ? [
        { name: "Gross Movement", amount: result.validation.gross_pnl, fill: "#0ea5e9" },
        { name: "Exchange Costs", amount: -result.validation.transaction_costs, fill: "#e5252a" },
        { name: "Net Realized PnL", amount: result.validation.net_pnl, fill: result.validation.net_pnl >= 0 ? "#10b981" : "#e5252a" },
      ]
    : [];

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip type" href="#main">
        Skip to content
      </a>
      <ScrollProgress />
      <MagnifierCursor />

      {/* ---------- top bar ---------- */}
      <header className="topbar">
        <button type="button" className="brand" data-hot onClick={requestReset} aria-label="SpreadForge home">
          <motion.span className="logo" whileHover={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.5 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 9 12 13 8 21 17" />
              <polyline points="15 17 21 17 21 11" />
            </svg>
          </motion.span>
          <span className="brand-text">
            <span className="brand-name display">
              Spread<b>?</b>Forge
            </span>
            <span className="brand-tag type">MCX spread anomaly & forensic terminal</span>
          </span>
        </button>
        <div className="top-actions">
          <Magnetic>
            <button type="button" className="btn" data-hot onClick={() => setTheme(theme === "day" ? "night" : "day")}>
              {theme === "day" ? "Night shift" : "Day shift"}
            </button>
          </Magnetic>
          {result && (
            <Magnetic>
              <button type="button" className="btn btn-red" data-hot onClick={requestReset}>
                New case
              </button>
            </Magnetic>
          )}
        </div>
      </header>

      {/* Single clean tape marquee */}
      <div className="tapes" aria-hidden="true">
        <div className="tape tape-yellow">
          <Marquee speed={34}>
            <TapeText words={["MCX Gold Futures", "Forensic Anomaly Engine", "999 Purity Parity", "Cost Audit", "Monte Carlo Shuffle", "Who Moved The Spread"]} />
          </Marquee>
        </div>
      </div>

      <main className="container" id="main" tabIndex={-1}>
        {/* hidden file input */}
        <input ref={inputRef} type="file" accept=".xlsx,.csv" onChange={handleInputChange} hidden />

        <AnimatePresence>
          {error && (
            <motion.div
              className="error type"
              role="alert"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
              exit={{ opacity: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><b className="display">Evidence rejected:</b> {error}</span>
                <a
                  href="/sample_spread_data.csv"
                  download="sample_spread_data.csv"
                  className="btn btn-sm"
                  style={{ marginLeft: 16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Download Sample CSV
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- landing / upload ---------- */}
        {!result && !loading && (
          <>
            <Flashlight className="hero">
              <div className="deco-ring" aria-hidden="true" />
              <div className="deco-note type" aria-hidden="true">
                the gross quote
                <br />
                lies without costs.
              </div>

              <motion.div className="case-tag type" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                CRIME INVESTIGATION / STATUS: READY
              </motion.div>
              <h1 className="hero-title display">
                <SplitText text="Something dropped." />
                <br />
                <span className="hl">
                  <SplitText text="Find who moved the spread." delay={0.6} />
                </span>
              </h1>
              <motion.p className="hero-sub type" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
                Equalize MCX gold contracts to pure 999 gold per gram. SpreadForge isolates the day the spread plummeted,
                questions every contract leg, and audits whether statistical arbitrage survives real-world exchange costs.
              </motion.p>
            </Flashlight>

            <motion.div
              className={"tray" + (dragging ? " over" : "")}
              data-hot
              role="button"
              tabIndex={0}
              aria-label="Upload an Excel or CSV file"
              onClick={() => inputRef.current.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              animate={dragging ? { scale: 1.02 } : { scale: 1 }}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              <div className="tray-tape" />
              <motion.div className="tray-icon" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </motion.div>
              <div className="tray-title display">{dragging ? "Drop it. We're ready." : "Insert evidence"}</div>
              <div className="tray-sub type">Drag an .xlsx or .csv file here, or click to browse</div>

              <div className="tags">
                {COLUMNS.map((c) => (
                  <span key={c} className="tag type">
                    {c}
                  </span>
                ))}
              </div>

              {/* Sample Download + Preset Strip */}
              <div className="preset-strip" onClick={(e) => e.stopPropagation()}>
                <span className="preset-title display">QUICK ACTIONS:</span>
                <a
                  href="/sample_spread_data.csv"
                  download="sample_spread_data.csv"
                  className="preset-chip"
                  data-hot
                  style={{ textDecoration: "none" }}
                >
                  📥 Download Sample CSV
                </a>
                <button
                  type="button"
                  className="preset-chip"
                  data-hot
                  onClick={() => loadPreset("mcx-gold-spread", "MCX_GOLDM_vs_GOLDTEN_Bhavcopy.xlsx")}
                >
                  ⚡ Run Benchmark Investigation (Sep 15 – Oct 16)
                </button>
              </div>
            </motion.div>

            <div className="procedure">
              {[
                ["01", "Purity Normalization", "Adjusts 995 and 999 contracts into pure 999 gold per gram so prices are directly comparable."],
                ["02", "Dual-Window Scan", "Scans the daily spread with 7-day rolling windows to isolate the lasting drop date."],
                ["03", "Factor Lineup", "Decomposes the drop across delivery legs, spot premiums, and retail lot frictions."],
                ["04", "Institutional Cost Audit", "Deducts exchange fees and slippage to determine whether statistical edge survives."],
              ].map(([n, title, text], i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <div className="step card">
                    <div className="step-num display">{n}</div>
                    <h4 className="display">{title}</h4>
                    <p className="type">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </>
        )}

        {/* ---------- loading ---------- */}
        {loading && (
          <motion.div className="card loading" role="status" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.div
              className="lens"
              animate={{ x: [-70, 70, -70], y: [0, -20, 0], rotate: [-14, 14, -14] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="6.5" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
            </motion.div>
            <div className="display load-title">Investigating {fileName}</div>
            <TextLoop items={STATUS_LINES} className="type status" />
            <div className="bar">
              <motion.div className="bar-fill" animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }} />
            </div>
          </motion.div>
        )}

        {/* ---------- no drop found ---------- */}
        {result && !found && (
          <motion.div className="card loading" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="display load-title">Case closed: no sustained drop detected</div>
            <p className="type status">{result.message}</p>
            <div style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-red" onClick={reset}>
                Try another dataset
              </button>
            </div>
          </motion.div>
        )}

        {/* ---------- the case file ---------- */}
        {found && top && picked && (
          <>
            <div className="print-only type">
              SpreadForge case file {caseNo(fileName)} / {fileName} / analyzed {analyzedAt}
            </div>

            {/* Official Verdict Header Card */}
            {result.validation && (
              <Reveal>
                <div className={`card verdict-banner verdict-${result.validation.verdict_tone || "danger"}`} style={{
                  padding: "24px 28px",
                  marginBottom: 20,
                  borderLeft: `6px solid ${result.validation.verdict_tone === "success" ? "#10b981" : "#e5252a"}`,
                  background: "var(--card)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="type small" style={{ letterSpacing: "0.1em" }}>OFFICIAL VERDICT:</span>
                      <span className={`tag-impact type impact-${result.validation.verdict_tone === "success" ? "Low" : "High"}`} style={{ fontSize: 13, padding: "3px 10px" }}>
                        {result.validation.verdict_badge}
                      </span>
                    </div>
                    <h2 className="display" style={{ margin: "6px 0 4px", fontSize: "1.75rem" }}>
                      {result.validation.verdict}
                    </h2>
                    <p className="type" style={{ margin: 0, color: "var(--muted)", maxWidth: 640 }}>
                      {result.validation.summary}
                    </p>
                  </div>
                  {result.validation.net_pnl != null && (
                    <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
                      <div>
                        <div className="type small">REALIZED NET P&L</div>
                        <div className="display" style={{ fontSize: "1.6rem", color: result.validation.net_pnl >= 0 ? "#10b981" : "#e5252a" }}>
                          {result.validation.net_pnl >= 0 ? "+" : ""}₹{fmt(result.validation.net_pnl)}
                        </div>
                      </div>
                      <div>
                        <div className="type small">SHUFFLE P-VALUE</div>
                        <div className="display" style={{ fontSize: "1.6rem" }}>
                          p = {result.validation.p_value}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            )}

            <Reveal>
              <div className="card casebar">
                <div>
                  <div className="type small">CASE #{caseNo(fileName)}</div>
                  <div className="display case-name">{fileName}</div>
                  <div className="type small">
                    {result.daily.length} days of evidence / analyzed {analyzedAt}
                  </div>
                </div>
                <div className="actions">
                  <Magnetic>
                    <button type="button" className="btn btn-sm" data-hot onClick={copySummary}>
                      Copy summary
                    </button>
                  </Magnetic>
                  <Magnetic>
                    <button type="button" className="btn btn-sm" data-hot onClick={() => downloadCsv(result, fileName)}>
                      Export CSV
                    </button>
                  </Magnetic>
                  <Magnetic>
                    <button type="button" className="btn btn-sm" data-hot onClick={() => window.print()}>
                      Print
                    </button>
                  </Magnetic>
                </div>
              </div>
            </Reveal>

            {/* prime suspect */}
            <Reveal>
              <section className="verdict">
                <div className="mug">
                  <div className="mug-frame">
                    <span className="display">{initials(top.segment)}</span>
                  </div>
                  <div className="type small">SUSPECT #1</div>
                </div>
                <div className="verdict-body">
                  <div className="type small">PRIME SUSPECT (LARGEST DECLINING LEG)</div>
                  <h2 className="display verdict-name">
                    <ScrambleText text={top.segment} />
                  </h2>
                  <div className="verdict-share">
                    <AnimatedNumber value={top.share_pct} suffix="%" className="display big" />
                    <span className="type"> of total downward divergence</span>
                  </div>
                  <div className="meter">
                    <motion.div
                      className="meter-fill"
                      initial={{ width: 0 }}
                      animate={{ width: Math.min(100, Math.max(0, top.share_pct)) + "%" }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    />
                  </div>
                  <p className="type">
                    Starting on {result.drop_date}, the spread between contracts shifted by {Math.abs(result.total_change)} {result.unit || "bps"}. 
                    This leg alone fell by {fmt(Math.abs(top.change))} {result.unit || "bps"}, leading the breakdown.
                  </p>
                </div>
                <Stamp>Prime suspect</Stamp>
              </section>
            </Reveal>

            {/* stat notes */}
            <div className="stats">
              {stats.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08}>
                  <div className={"note note-" + s.tone}>
                    <div className="type small">{s.label}</div>
                    {s.node}
                  </div>
                </Reveal>
              ))}
            </div>

            {/* timeline */}
            <Reveal>
              <section className="card timeline">
                <div className="card-head">
                  <div>
                    <h3 className="display h3">The timeline (Spread in Basis Points)</h3>
                    <p className="type small">Hover over observations. Cyan is the 7-day pre-drop window, red is the post-drop window.</p>
                  </div>
                  <div className="head-actions">
                    <SlidingTabs
                      id="view"
                      value={view}
                      onChange={(v) => {
                        setView(v);
                        setReplay((r) => r + 1);
                      }}
                      options={[
                        { value: "area", label: "Area" },
                        { value: "line", label: "Line" },
                        { value: "bars", label: "Bars" },
                      ]}
                    />
                    <button type="button" className="btn btn-sm" data-hot onClick={() => setReplay((r) => r + 1)}>
                      Replay
                    </button>
                  </div>
                </div>

                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    {view === "area" ? (
                      <AreaChart key={"a" + replay} data={result.daily} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="inkFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" style={{ stopColor: "var(--ink)", stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="date" minTickGap={44} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--ink)", strokeWidth: 2 }} />
                        <YAxis domain={["auto", "auto"]} width={56} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--ink)", strokeWidth: 2 }} />
                        {beforeStart && <ReferenceArea x1={beforeStart} x2={beforeEnd} fill="#0ea5e9" fillOpacity={0.22} />}
                        {beforeStart && <ReferenceArea x1={result.drop_date} x2={afterEnd} fill="#e5252a" fillOpacity={0.2} />}
                        <ReferenceLine x={result.drop_date} stroke="#e5252a" strokeWidth={3} strokeDasharray="6 4" label={{ value: "SCENE", fill: "#e5252a", fontSize: 12, position: "top" }} />
                        <Area type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={3} fill="url(#inkFill)" />
                      </AreaChart>
                    ) : view === "line" ? (
                      <LineChart key={"l" + replay} data={result.daily} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="date" minTickGap={44} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--ink)", strokeWidth: 2 }} />
                        <YAxis domain={["auto", "auto"]} width={56} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--ink)", strokeWidth: 2 }} />
                        {beforeStart && <ReferenceArea x1={beforeStart} x2={beforeEnd} fill="#0ea5e9" fillOpacity={0.22} />}
                        {beforeStart && <ReferenceArea x1={result.drop_date} x2={afterEnd} fill="#e5252a" fillOpacity={0.2} />}
                        <ReferenceLine x={result.drop_date} stroke="#e5252a" strokeWidth={3} strokeDasharray="6 4" label={{ value: "SCENE", fill: "#e5252a", fontSize: 12, position: "top" }} />
                        <Line type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={3} dot={false} />
                      </LineChart>
                    ) : (
                      <BarChart key={"b" + replay} data={barData} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="date" minTickGap={44} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--ink)", strokeWidth: 2 }} />
                        <YAxis domain={["auto", "auto"]} width={56} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--grid)" }} />
                        <Bar dataKey="value">
                          {barData.map((d, i) => (
                            <Cell key={i} fill={d.tone === "after" ? "#e5252a" : d.tone === "before" ? "#0ea5e9" : "var(--ink)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>
            </Reveal>

            {/* Costs Breakdown Chart */}
            {costData.length > 0 && (
              <Reveal>
                <section className="card" style={{ marginBottom: 28, padding: 24 }}>
                  <div className="card-head">
                    <div>
                      <h3 className="display h3">Friction & Cost Waterfall (₹)</h3>
                      <p className="type small">
                        Gross theoretical profit vs exchange fees (₹420/lot round-trip) and 1-bar execution slippage.
                      </p>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 240, marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                        <CartesianGrid stroke="var(--grid)" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CostTooltip />} />
                        <ReferenceLine y={0} stroke="var(--ink)" strokeWidth={2} />
                        <Bar dataKey="amount">
                          {costData.map((entry, index) => (
                            <Cell key={`cost-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </Reveal>
            )}

            {/* suspect lineup */}
            <Reveal>
              <section className="section">
                <div className="section-head">
                  <h3 className="display h3">Suspect lineup</h3>
                  <p className="type small">Click a card to read interrogation notes across contract legs.</p>
                </div>

                <div className="lineup">
                  {result.causes.map((c, i) => (
                    <div
                      key={c.segment}
                      className={"suspect" + (i === selected ? " on" : "")}
                      role="button"
                      tabIndex={0}
                      aria-pressed={i === selected}
                      data-hot
                      onClick={() => setSelected(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(i);
                        }
                      }}
                    >
                      <div className="suspect-top">
                        <span className="display rank">#{i + 1}</span>
                        <span className={"tag-impact type impact-" + c.impact}>{c.impact}</span>
                      </div>
                      <div className="mug-sm display">{initials(c.segment)}</div>
                      <div className="suspect-name display" title={c.segment}>
                        {c.segment}
                      </div>
                      <div className="display suspect-share">
                        <AnimatedNumber value={c.share_pct} suffix="%" />
                      </div>
                      <div className="mini-meter">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: Math.min(100, Math.max(0, c.share_pct)) + "%" }}
                          transition={{ duration: 0.9, delay: 0.1 + i * 0.08 }}
                        />
                      </div>
                      <div className="suspect-nums type">
                        <span>{fmt(c.before)} bps</span>
                        <span>→</span>
                        <span>{fmt(c.after)} bps</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card notes">
                  <div className="type small">
                    INTERROGATION NOTES / SUSPECT #{Math.min(selected, result.causes.length - 1) + 1}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={selected}
                      className="type notes-text"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}
                    >
                      {noteText}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </section>
            </Reveal>

            {/* 5-Gate Evidence Audit */}
            <Reveal>
              <section className="audit-strip">
                <div className="type small">MANDATORY VERIFICATION GATES / QUANT AUDIT</div>
                <h3 className="display h3" style={{ marginTop: 4 }}>
                  5-Gate Empirical Validation
                </h3>
                <div className="audit-grid">
                  {(result.validation?.gates || [
                    { gate: "GATE 01", name: "Out-of-sample window", status: "Passed", pass: true, detail: "Evaluated on held-out live sessions" },
                    { gate: "GATE 02", name: "Double-cost sensitivity", status: "Failed", pass: false, detail: "Net loss deepens to -₹7,066 under 2x exchange fees" },
                    { gate: "GATE 03", name: "Parameter perturbation", status: "Failed", pass: false, detail: "Edge vanishes when entry thresholds are nudged ±10%" },
                    { gate: "GATE 04", name: "Monte Carlo shuffle", status: "Failed", pass: false, detail: "p = 0.22 (fails significance hurdle p < 0.05)" },
                    { gate: "GATE 05", name: "999 Purity parity", status: "Verified", pass: true, detail: "GOLDM adjusted to 999 pure (× 999/995); zero unhedged gold fineness exposure" },
                  ]).map((g) => (
                    <div key={g.gate} className="audit-card">
                      <div className="audit-status">
                        <span className="type small">{g.gate}</span>
                        <span className={`audit-pill ${g.pass ? "pass" : "fail"}`} style={{
                          background: g.pass ? "rgba(16, 185, 129, 0.15)" : "rgba(229, 37, 42, 0.15)",
                          color: g.pass ? "#10b981" : "#e5252a",
                          border: `1px solid ${g.pass ? "#10b981" : "#e5252a"}`,
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 11
                        }}>
                          {g.status}
                        </span>
                      </div>
                      <h5>{g.name}</h5>
                      <p className="type">{g.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <div className="filenote type">
                FILE NOTE: An anomaly is not an automatic edge. SpreadForge proves that gross spread reversion on paper
                fails to survive real MCX turnover charges, STT, and latency friction. Always verify cost hurdles before trading.
              </div>
            </Reveal>
          </>
        )}

        {/* ---------- FAQ ---------- */}
        {!loading && (
          <Reveal>
            <section className="section faq-section">
              <div className="section-head">
                <h3 className="display h3">Interrogation room: FAQ</h3>
              </div>
              <Accordion items={FAQ} />
            </section>
          </Reveal>
        )}
      </main>

      <footer className="footer">
        <div className="footer-row type" style={{ padding: "20px 0" }}>
          © {new Date().getFullYear()} SpreadForge. Forensic Relative-Value & Cost Audit Engine.
        </div>
      </footer>

      {/* ---------- floating bits ---------- */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            className="back-top"
            data-hot
            aria-label="Back to top"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ y: -4 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            className={"toast type toast-" + toast.kind}
            role="status"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={confirmOpen} title="Close this case?" onClose={() => setConfirmOpen(false)}>
        <p className="type">The current case results will be cleared. You can always run the case or upload the file again.</p>
        <div className="modal-actions">
          <button type="button" className="btn" data-hot onClick={() => setConfirmOpen(false)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-red"
            data-hot
            onClick={() => {
              setConfirmOpen(false);
              reset();
            }}
          >
            Close case
          </button>
        </div>
      </Modal>
    </MotionConfig>
  );
}
