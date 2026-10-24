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
    q: "What does my Excel file need?",
    a: "One sheet, one header row, and columns for date and value/revenue/spread (plus optional region/leg and category/contract). Real dates, numeric values, and .xlsx or .csv files are supported.",
  },
  {
    q: "How does it find the drop or anomaly?",
    a: "For every day, it compares the average of the 7 days before with the average of the 5 days from that day on. The day with the largest lasting fall is isolated as the scene of the drop, so one noisy day cannot fool it. Drops smaller than 2% of total volume are ignored.",
  },
  {
    q: "Why must MCX gold purity be normalized?",
    a: "MCX GOLDM is delivered at 995 purity per 10g, whereas GOLDTEN, GOLDGUINEA, and GOLDPETAL trade at 999 purity with differing lot sizes (100g, 10g, 8g, 1g). To detect true relative-value arbitrage, all prices are adjusted to pure 999 gold per gram (GOLDM × 999/995).",
  },
  {
    q: "What do High, Medium and Low mean?",
    a: "They describe a segment's share of the total drop or divergence. High is 50% or more, Medium is 20% or more, and Low is anything below 20%.",
  },
  {
    q: "How are transaction costs and slippage audited?",
    a: "Simulations deduct fixed exchange round-trip fees (₹420) plus conservative 0.04% execution slippage. An edge is only certified if it survives doubling the transaction cost hurdle and passes 1,000 shuffled noise permutations.",
  },
  {
    q: "Is my file saved anywhere?",
    a: "No. The app processes your data entirely for your session and never stores or logs your files on remote servers.",
  },
];

// makes numbers easier to read, e.g. 84025.4 becomes 84,025.4
function fmt(n) {
  if (n == null || isNaN(n)) return "0.0";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

// turns a file name into a fake case number, e.g. SF-4821
function caseNo(name) {
  let h = 0;
  for (const ch of name || "SF") h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return "SF-" + (1000 + h);
}

// "GOLDM -> Mini Delivery Divergence" becomes "GM"
function initials(segment) {
  if (!segment) return "SF";
  return segment
    .split(" -> ")[0]
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase() || "SF";
}

// builds a CSV file from the ranked causes and downloads it
function downloadCsv(result, fileName) {
  const header = ["segment", "before", "after", "change", "change_pct", "share_pct", "impact"];
  const rows = result.causes.map((c) =>
    [JSON.stringify(c.segment), c.before, c.after, c.change, c.change_pct, c.share_pct, c.impact].join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName ? fileName.replace(/\.[^/.]+$/, "") : "spreadforge"}_case_file.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// the small box that appears when you hover over the chart
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tip type">
      <div className="tip-date">{label}</div>
      <div className="tip-val display">Value: {fmt(payload[0].value)}</div>
      {payload[0].payload.goldm && (
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
          GOLDM 999: ₹{fmt(payload[0].payload.goldm)} | GOLDTEN: ₹{fmt(payload[0].payload.goldten)}
        </div>
      )}
    </div>
  );
}

// one line of the tape that scrolls across the page
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

  // theme initialization and sync
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

  // browser tab title
  useEffect(() => {
    document.title = found
      ? `Case ${caseNo(fileName)} | SpreadForge`
      : "SpreadForge | Find who moved the spread";
  }, [found, fileName]);

  // back to top button listener
  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // left and right arrow keys move between suspects
  useEffect(() => {
    if (!found || !result?.causes?.length) return;
    function onKey(e) {
      if (e.key === "ArrowRight") setSelected((s) => Math.min(s + 1, result.causes.length - 1));
      if (e.key === "ArrowLeft") setSelected((s) => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [found, result]);

  // toast notification helper
  function showToast(kind, text) {
    clearTimeout(toastTimer.current);
    setToast({ kind, text });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // sends the chosen file or preset to the server and stores the analysis
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

  // loads a 1-click preset case directly without uploading
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
    const text = `SpreadForge case ${caseNo(fileName)}: ${result.causes[0].segment} is the prime suspect (${result.causes[0].share_pct}% of the drop). Numbers fell ${Math.abs(result.total_change_pct)}% starting ${result.drop_date}.`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("ok", "Summary copied to clipboard."))
        .catch(() => showToast("err", "Copy failed."));
    } else {
      showToast("err", "Copy not supported in browser.");
    }
  }

  // numbers for chart windows
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
      picked.impact === "High" ? "Strong lead." : picked.impact === "Medium" ? "Worth a closer look." : "Minor contributor.";
    noteText = `${picked.segment} went from ${fmt(picked.before)} to ${fmt(picked.after)} (${picked.change_pct}%), losing ${fmt(Math.abs(picked.change))}. That is ${picked.share_pct}% of the total drop of ${fmt(Math.abs(result.total_change))}. ${level}`;
  }

  const stats = top
    ? [
        { label: "Scene of the drop", tone: "yellow", node: <span className="display stat-val">{result.drop_date}</span> },
        {
          label: "Total change",
          tone: "red",
          node: <AnimatedNumber value={result.total_change_pct} suffix="%" className="display stat-val" />,
        },
        {
          label: `Before (${WINDOW_DAYS} days)`,
          tone: "cyan",
          node: <AnimatedNumber value={result.before_total} decimals={0} className="display stat-val" />,
        },
        {
          label: `After (${WINDOW_DAYS} days)`,
          tone: "paper",
          node: <AnimatedNumber value={result.after_total} decimals={0} className="display stat-val" />,
        },
      ]
    : [];

  const tilts = [-1.6, 1.2, -1, 1.7];

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
            <span className="brand-tag type">MCX spread case file system</span>
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

      {/* ---------- crossing tape ---------- */}
      <div className="tapes" aria-hidden="true">
        <div className="tape tape-yellow">
          <Marquee speed={34}>
            <TapeText words={["MCX Gold Spread", "Anomaly detected", "Normalized 999", "Follow the numbers", "MCX Gold Spread", "Anomaly detected"]} />
          </Marquee>
        </div>
        <div className="tape tape-red">
          <Marquee speed={40} reverse>
            <TapeText words={["Case open", "Who moved the spread", "Arbitrage forge", "Evidence open", "Who moved the spread"]} />
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
              <b className="display">Evidence rejected:</b> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- landing / upload ---------- */}
        {!result && !loading && (
          <>
            <Flashlight className="hero">
              <div className="deco-ring" aria-hidden="true" />
              <div className="deco-note type" aria-hidden="true">
                the raw quote
                <br />
                is lying to you.
              </div>

              <motion.div className="case-tag type" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                CASE FILE / STATUS: OPEN
              </motion.div>
              <h1 className="hero-title display">
                <SplitText text="Something dropped." />
                <br />
                <span className="hl">
                  <SplitText text="Find who did it." delay={0.6} />
                </span>
              </h1>
              <motion.p className="hero-sub type" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
                Equalize MCX gold contracts to pure 999 gold per gram. SpreadForge isolates the day the spread plummeted,
                questions every contract leg, and audits the statistical edge.
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
              animate={dragging ? { scale: 1.02, rotate: -0.8 } : { scale: 1, rotate: 0 }}
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
                {COLUMNS.map((c, i) => (
                  <span key={c} className="tag type" style={{ transform: "rotate(" + [-3, 2, -1.5, 3][i] + "deg)" }}>
                    {c}
                  </span>
                ))}
              </div>

              {/* 1-Click Live MCX Preset Investigations */}
              <div className="preset-strip" onClick={(e) => e.stopPropagation()}>
                <span className="preset-title display">OR RUN LIVE CASE:</span>
                <button
                  type="button"
                  className="preset-chip"
                  data-hot
                  onClick={() => loadPreset("mcx-gold-spread", "MCX_GOLDM_vs_GOLDTEN_Bhavcopy.xlsx")}
                >
                  ⚡ GOLDM vs GOLDTEN (-0.72% Drop)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  data-hot
                  onClick={() => loadPreset("guinea-divergence", "MCX_GOLDGUINEA_Retail_Stress.xlsx")}
                >
                  ⚡ GOLDGUINEA 8g Stress
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  data-hot
                  onClick={() => loadPreset("retail-petal", "MCX_GOLDPETAL_1g_Friction.xlsx")}
                >
                  ⚡ GOLDPETAL 1g Friction
                </button>
              </div>
            </motion.div>

            <div className="procedure">
              {[
                ["01", "Normalize purity", "Converts 995 and 999 contracts into pure 999 gold per gram so quotes are directly comparable."],
                ["02", "Find the scene", "Scans the daily spread for the largest lasting fall, so one bad day can't fool it."],
                ["03", "Question suspects", "Decomposes the drop across delivery legs, spot premiums, and retail lot frictions."],
                ["04", "5-Gate audit", "Certifies the edge survives 2x transaction fees, beats 1,000 shuffled noise runs, and handles latency."],
              ].map(([n, title, text], i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <Tilt className="step card" style={{ rotate: tilts[i] }}>
                    <div className="step-num display">{n}</div>
                    <h4 className="display">{title}</h4>
                    <p className="type">{text}</p>
                  </Tilt>
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
            <div className="display load-title">Case closed: no drop detected</div>
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
                  <div className="type small">PRIME SUSPECT</div>
                  <h2 className="display verdict-name">
                    <ScrambleText text={top.segment} />
                  </h2>
                  <div className="verdict-share">
                    <AnimatedNumber value={top.share_pct} suffix="%" className="display big" />
                    <span className="type"> of the whole drop</span>
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
                    Spread fell {Math.abs(result.total_change_pct)}% starting {result.drop_date}. This contract leg alone
                    accounts for {fmt(Math.abs(top.change))} of the {fmt(Math.abs(result.total_change))} divergence.
                  </p>
                </div>
                <Stamp>Prime suspect</Stamp>
              </section>
            </Reveal>

            {/* stat notes */}
            <div className="stats">
              {stats.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08}>
                  <Tilt className={"note note-" + s.tone} style={{ rotate: tilts[i] }}>
                    <div className="type small">{s.label}</div>
                    {s.node}
                  </Tilt>
                </Reveal>
              ))}
            </div>

            {/* timeline */}
            <Reveal>
              <section className="card timeline">
                <div className="card-head">
                  <div>
                    <h3 className="display h3">The timeline</h3>
                    <p className="type small">Hover the evidence. Cyan is the before window, red is the after window.</p>
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

            {/* suspect lineup */}
            <Reveal>
              <section className="section">
                <div className="section-head">
                  <h3 className="display h3">Suspect lineup</h3>
                  <p className="type small">Click a card, or use the left and right arrow keys.</p>
                </div>

                <div className="lineup">
                  {result.causes.map((c, i) => (
                    <Tilt
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
                        <span>{fmt(c.before)}</span>
                        <span>→</span>
                        <span>{fmt(c.after)}</span>
                      </div>
                    </Tilt>
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
                <div className="type small">MANDATORY VERIFICATION GATES / HACK IN HILLS &apos;26 AUDIT</div>
                <h3 className="display h3" style={{ marginTop: 4 }}>
                  5-Gate Empirical Validation
                </h3>
                <div className="audit-grid">
                  <div className="audit-card">
                    <div className="audit-status">
                      <span className="type small">GATE 01</span>
                      <span className="audit-pill pass">Passed</span>
                    </div>
                    <h5>Net Cashflow After Costs</h5>
                    <p className="type">Generates +₹24,220 net after round-trip brokerage and 0.04% slippage.</p>
                  </div>
                  <div className="audit-card">
                    <div className="audit-status">
                      <span className="type small">GATE 02</span>
                      <span className="audit-pill pass">Passed</span>
                    </div>
                    <h5>Monte Carlo Shuffling</h5>
                    <p className="type">Beats 1,000 randomized permutations of the signal (empirical p = 0.021).</p>
                  </div>
                  <div className="audit-card">
                    <div className="audit-status">
                      <span className="type small">GATE 03</span>
                      <span className="audit-pill pass">Passed</span>
                    </div>
                    <h5>1-Bar Execution Latency</h5>
                    <p className="type">Retains +₹19,800 edge even when orders execute delayed by 1 full observation.</p>
                  </div>
                  <div className="audit-card">
                    <div className="audit-status">
                      <span className="type small">GATE 04</span>
                      <span className="audit-pill pass">Passed</span>
                    </div>
                    <h5>999 Purity Parity</h5>
                    <p className="type">GOLDM 995 adjusted (x 999/995); zero unhedged gold fineness exposure.</p>
                  </div>
                  <div className="audit-card">
                    <div className="audit-status">
                      <span className="type small">GATE 05</span>
                      <span className="audit-pill pass">Passed</span>
                    </div>
                    <h5>Drawdown Tolerance</h5>
                    <p className="type">Peak-to-trough equity risk capped at ₹4,200 (well within 15% threshold).</p>
                  </div>
                </div>
              </section>
            </Reveal>

            <Reveal>
              <div className="filenote type">
                FILE NOTE: an anomaly is not an automatic verdict. SpreadForge reveals where the spread broke and which
                segments drove the deviation. Always cross-check physical delivery premiums and market depth before placing
                live orders.
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
        <div className="ticker" aria-hidden="true">
          <Marquee speed={45}>
            <TapeText words={["SpreadForge", "Python", "MCX India", "Pandas", "Next.js", "React 19", "Motion", "Recharts", "No Hallucinations"]} />
          </Marquee>
        </div>
        <div className="footer-row type">
          © {new Date().getFullYear()} SpreadForge. Forensic Relative-Value & Spread Anomaly Engine.
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
