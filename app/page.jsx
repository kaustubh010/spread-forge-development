"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CircleHelp,
  Download,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Vault as VaultIcon,
  X,
} from "lucide-react";
import { contracts, observations, runs, spreadSeries } from "../lib/mock-data";
import { simulateRun } from "../lib/simulation";
import { readStoredRuns, writeStoredRuns } from "../lib/run-storage";
import {
  CONTRACTS,
  PERIODS,
  alignHistoricalSeries,
  fetchHistoricalSeries,
  toSimulationObservations,
} from "../lib/market-data";

const navItems = [
  ["Overview", LayoutDashboard],
  ["Contract Explorer", Boxes],
  ["Strategy Lab", FlaskConical],
  ["Backtest Results", BarChart3],
  ["Evidence & Validation", ShieldCheck],
  ["Research Vault", VaultIcon],
];
const money = (value) =>
  `${value < 0 ? "−" : ""}₹${Math.abs(Number(value || 0)).toLocaleString("en-IN")}`;
const demoRun = () =>
  simulateRun({
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    observations,
    entryThreshold: 0.35,
    exitThreshold: 0.08,
    transactionCosts: 420,
    slippage: 0.04,
    lookback: 20,
  });

function Badge({ children, tone = "muted" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
function Metric({ label, value, detail, tone = "" }) {
  return (
    <div className="metric">
      <div className="eyebrow">{label}</div>
      <div className={`metric-value ${tone}`}>{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}
function EmptyRun({ onNavigate }) {
  return (
    <div className="empty-panel">
      <ShieldCheck />
      <h2>No completed run selected</h2>
      <p>
        Run a simulation in Strategy Lab to populate metrics, trades, equity,
        and validation evidence.
      </p>
      <button
        className="button button-primary"
        onClick={() => onNavigate("Strategy Lab")}
      >
        <Play /> Open Strategy Lab
      </button>
    </div>
  );
}
function SpreadChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={spreadSeries}
        margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
      >
        <CartesianGrid
          stroke="var(--line)"
          strokeDasharray="2 4"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted-text)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.slice(5)}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: "var(--muted-text)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
          domain={["auto", "auto"]}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="spread"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
function Header({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="breadcrumb">RESEARCH / {eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Overview({ onNavigate, currentRun }) {
  return (
    <>
      <Header
        eyebrow="OVERVIEW"
        title="Market overview"
        description="Relative-value monitor for the provisional MCX gold contract universe."
        action={
          <div className="heading-actions">
            <Badge tone="demo">DEMO DATA</Badge>
            <button
              className="button button-outline"
              onClick={() => onNavigate("Strategy Lab")}
            >
              <Plus /> New simulation
            </button>
          </div>
        }
      />
      <section className="status-strip">
        <div>
          <Activity className="green-icon" />
          <span>Observation stream</span>
          <strong>Simulated · current through 14:32 IST</strong>
        </div>
        <div className="status-note">
          <CircleHelp /> Contract specifications are provisional working
          assumptions.
        </div>
      </section>
      <div className="section-label">
        <span>Contract comparison matrix</span>
        <span className="caption">
          Illustrative values · normalized price per gram
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Lot size</th>
              <th>Expiry</th>
              <th className="num">Price</th>
              <th className="num">Spread</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.symbol}>
                <td>
                  <strong>{c.symbol}</strong>
                  <small>{c.name}</small>
                </td>
                <td className="mono">{c.lot}</td>
                <td className="mono">{c.expiry}</td>
                <td className="num mono">₹{c.price.toLocaleString("en-IN")}</td>
                <td
                  className={`num mono ${c.spread >= 0 ? "positive" : "negative"}`}
                >
                  {c.spread > 0 ? "+" : ""}
                  {c.spread.toFixed(2)}%
                </td>
                <td>
                  <Badge tone="demo">Synthetic</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Relative spread</div>
              <h2>Normalized spread history</h2>
            </div>
          </div>
          <SpreadChart />
        </section>
        <section className="panel signals-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Current run</div>
              <h2>{currentRun ? currentRun.id : "No run yet"}</h2>
            </div>
            <Badge tone={currentRun ? "positive" : "muted"}>
              {currentRun ? "COMPLETE" : "EMPTY"}
            </Badge>
          </div>
          {currentRun ? (
            <div className="metric-grid compact-metrics">
              <Metric
                label="Net P&L"
                value={money(currentRun.netPnl)}
                detail="Gross less costs"
                tone={currentRun.netPnl >= 0 ? "positive" : "negative"}
              />
              <Metric
                label="Trades"
                value={currentRun.tradeCount}
                detail={`${currentRun.wins} wins / ${currentRun.losses} losses`}
              />
            </div>
          ) : (
            <p className="muted-text">
              No qualifying simulation has been completed.
            </p>
          )}
          <button
            className="text-button"
            onClick={() =>
              onNavigate(currentRun ? "Backtest Results" : "Strategy Lab")
            }
          >
            {currentRun ? "View results" : "Run first simulation"}{" "}
            <ArrowUpRight />
          </button>
        </section>
      </div>
    </>
  );
}

function HistoricalStrategyLab({ onNavigate, onRun }) {
  const [params, setParams] = useState({
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    period: "90",
    entryThreshold: "0.35",
    exitThreshold: "0.08",
    transactionCosts: "420",
    slippage: "0.04",
    lookback: "20",
  });
  const [series, setSeries] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key, value) => {
    setParams((current) => ({ ...current, [key]: value }));
    setSeries(null);
    setStatus("");
    setError("");
  };
  const dates = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Number(params.period));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [params.period]);
  const fetchData = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    setSeries(null);
    try {
      const [a, b] = await Promise.all([
        fetchHistoricalSeries({ contract: params.contractA, ...dates }),
        fetchHistoricalSeries({ contract: params.contractB, ...dates }),
      ]);
      const aligned = alignHistoricalSeries(a, b);
      setSeries({
        a,
        b,
        aligned,
        observations: toSimulationObservations(aligned),
      });
      setStatus(
        `Matched ${aligned.matched.length} trading dates. ${aligned.missing.length} dates excluded.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const run = () => {
    if (!series?.observations?.length)
      return setError(
        "Fetch and validate historical data before running the backtest.",
      );
    try {
      const result = simulateRun({
        ...params,
        observations: series.observations,
        entryThreshold: Number(params.entryThreshold),
        exitThreshold: Number(params.exitThreshold),
        transactionCosts: Number(params.transactionCosts),
        slippage: Number(params.slippage),
        lookback: Number(params.lookback),
        dataSource: "Historical market data",
      });
      onRun({
        ...result,
        dataSource: "Historical market data",
        validation: {
          ...result.validation,
          matchedObservations: series.observations.length,
          excludedRecords: series.aligned.excludedCount,
          missingDates: series.aligned.missing,
        },
      });
      setStatus("Backtest completed from validated historical observations.");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <Header
        eyebrow="STRATEGY LAB"
        title="Strategy lab"
        description="Fetch and validate contract-level historical data before running the existing spread simulation."
        action={<Badge tone="demo">PROVIDER REQUIRED</Badge>}
      />
      <section className="panel form-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Historical data selection</div>
            <h2>Mean-reversion setup</h2>
          </div>
          <Settings2 />
        </div>
        <div className="form-grid">
          <label>
            <span>Contract A</span>
            <select
              value={params.contractA}
              onChange={(e) => update("contractA", e.target.value)}
            >
              {[...CONTRACTS].map((contract) => (
                <option key={contract}>{contract}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Contract B</span>
            <select
              value={params.contractB}
              onChange={(e) => update("contractB", e.target.value)}
            >
              {[...CONTRACTS]
                .filter((contract) => contract !== params.contractA)
                .map((contract) => (
                  <option key={contract}>{contract}</option>
                ))}
            </select>
          </label>
          <label>
            <span>Historical period</span>
            <select
              value={params.period}
              onChange={(e) => update("period", e.target.value)}
            >
              {[...PERIODS].map((period) => (
                <option key={period} value={period}>
                  {period} days
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Data source</span>
            <input value="Historical market data" readOnly />
          </label>
          <label>
            <span>Start date (IST)</span>
            <input value={dates.startDate} readOnly />
          </label>
          <label>
            <span>End date (IST)</span>
            <input value={dates.endDate} readOnly />
          </label>
          <label>
            <span>Entry threshold</span>
            <input
              value={params.entryThreshold}
              onChange={(e) => update("entryThreshold", e.target.value)}
            />
          </label>
          <label>
            <span>Exit threshold</span>
            <input
              value={params.exitThreshold}
              onChange={(e) => update("exitThreshold", e.target.value)}
            />
          </label>
        </div>
        <div className="heading-actions">
          <button
            className="button button-outline"
            onClick={fetchData}
            disabled={loading || params.contractA === params.contractB}
          >
            {loading ? "Fetching…" : "Fetch Historical Data"}
          </button>
          <button
            className="button button-primary"
            onClick={run}
            disabled={loading || !series?.observations?.length}
          >
            {" "}
            <Play /> Run Backtest
          </button>
        </div>
        {error && <div className="inline-error">{error}</div>}
        {status && <div className="inline-success">{status}</div>}
        <p className="caption">
          No demo fallback is used. The server endpoint must be connected to a
          configured provider; rollover and contract specifications must be
          verified before production analysis.
        </p>
      </section>
      {series && (
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Validated preview</div>
              <h2>{series.observations.length} matched observations</h2>
            </div>
            <Badge tone="positive">HISTORICAL</Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contract A close</th>
                  <th>Contract B close</th>
                  <th className="num">Spread</th>
                </tr>
              </thead>
              <tbody>
                {series.aligned.matched.slice(-12).map((row) => (
                  <tr key={row.date}>
                    <td className="mono">{row.date}</td>
                    <td className="mono">{row.closeA}</td>
                    <td className="mono">{row.closeB}</td>
                    <td className="num mono">
                      {(((row.closeA - row.closeB) / row.closeB) * 100).toFixed(
                        3,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function StrategyLab({ onNavigate, onRun }) {
  const [params, setParams] = useState({
    contractA: "GOLDM",
    contractB: "GOLDTEN",
    entryThreshold: "0.35",
    exitThreshold: "0.08",
    transactionCosts: "420",
    slippage: "0.04",
    lookback: "20",
  });
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const update = (key, value) => setParams((p) => ({ ...p, [key]: value }));
  const run = () => {
    setError("");
    if (params.contractA === params.contractB)
      return setError("Contract A and Contract B must be different.");
    if (Number(params.entryThreshold) <= Number(params.exitThreshold))
      return setError("Entry threshold must be greater than exit threshold.");
    if (
      ![
        params.entryThreshold,
        params.exitThreshold,
        params.transactionCosts,
        params.slippage,
        params.lookback,
      ].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0)
    )
      return setError("Use valid non-negative numeric values.");
    setRunning(true);
    window.setTimeout(() => {
      try {
        const next = simulateRun(params);
        setResult(next);
        onRun(next);
      } catch (e) {
        setError(e.message);
      } finally {
        setRunning(false);
      }
    }, 250);
  };
  return (
    <>
      <Header
        eyebrow="STRATEGY LAB"
        title="Strategy lab"
        description="Configure a deterministic simulation from synthetic observations."
        action={<Badge tone="demo">SYNTHETIC INPUTS</Badge>}
      />
      <div className="lab-grid">
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Simulation parameters</div>
              <h2>Mean-reversion setup</h2>
            </div>
            <Settings2 />
          </div>
          <div className="form-grid">
            {[
              ["contractA", "Contract A"],
              ["contractB", "Contract B"],
              ["entryThreshold", "Entry threshold"],
              ["exitThreshold", "Exit threshold"],
              ["transactionCosts", "Costs / round trip"],
              ["slippage", "Slippage %"],
              ["lookback", "Lookback observations"],
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                {key.startsWith("contract") ? (
                  <select
                    value={params[key]}
                    onChange={(e) => update(key, e.target.value)}
                  >
                    {contracts.map((c) => (
                      <option key={c.symbol}>{c.symbol}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    inputMode="decimal"
                    value={params[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button
              className="button button-primary"
              onClick={run}
              disabled={running}
            >
              <Play /> {running ? "Running…" : "Run simulation"}
            </button>
            <button
              className="button button-ghost"
              onClick={() => setResult(null)}
            >
              Reset
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          {result && (
            <div className="success-message">
              <ShieldCheck /> {result.id} completed from{" "}
              {result.observations.length} observations.{" "}
              <button onClick={() => onNavigate("Backtest Results")}>
                View results
              </button>
            </div>
          )}
        </section>
        <section className="panel lab-aside">
          <div className="eyebrow">Canonical output</div>
          {result ? (
            <div className="metric-grid compact-metrics">
              <Metric
                label="Net P&L"
                value={money(result.netPnl)}
                detail="Gross less total costs"
                tone={result.netPnl >= 0 ? "positive" : "negative"}
              />
              <Metric
                label="Trades"
                value={result.tradeCount}
                detail={
                  result.tradeCount
                    ? `${result.wins} wins / ${result.losses} losses`
                    : "No qualifying trades"
                }
              />
            </div>
          ) : (
            <p className="muted-text">
              The exact result object will feed every research screen.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function BacktestResults({ run, onNavigate }) {
  if (!run)
    return (
      <>
        <Header
          eyebrow="BACKTEST RESULTS"
          title="Backtest results"
          description="Review the canonical output of the selected simulation."
        />
        <EmptyRun onNavigate={onNavigate} />
      </>
    );
  return (
    <>
      <Header
        eyebrow="BACKTEST RESULTS"
        title="Backtest results"
        description={`Canonical output for ${run.id} · ${run.period}`}
        action={<Badge tone="demo">{run.calculationKey}</Badge>}
      />
      <div className="metric-grid">
        <Metric
          label="Net P&L"
          value={money(run.netPnl)}
          detail={`Gross ${money(run.grossPnl)} − costs ${money(run.totalCosts)}`}
          tone={run.netPnl >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Win rate"
          value={run.winRate == null ? "—" : `${run.winRate}%`}
          detail={`${run.tradeCount} completed trades`}
        />
        <Metric
          label="Max drawdown"
          value={money(run.maxDrawdown)}
          detail="Realized equity peak-to-trough"
          tone="negative"
        />
        <Metric
          label="Sharpe ratio"
          value={run.sharpe == null ? "Not available" : run.sharpe}
          detail="Requires suitable return series"
        />
      </div>
      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Equity curve</div>
            <h2>Final equity {money(run.equity.at(-1)?.value)}</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={run.equity}>
            <CartesianGrid
              stroke="var(--line)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              fill="var(--accent-soft)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <TradeTable run={run} />
    </>
  );
}
function TradeTable({ run }) {
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Trade ledger</div>
          <h2>Closed trades</h2>
        </div>
        <Badge tone="demo">{run.trades.length} ROWS</Badge>
      </div>
      {run.trades.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trade</th>
                <th>Entry → Exit</th>
                <th>Direction</th>
                <th className="num">Gross</th>
                <th className="num">Costs</th>
                <th className="num">Net</th>
                <th>Exit reason</th>
              </tr>
            </thead>
            <tbody>
              {run.trades.map((t) => (
                <tr key={t.id}>
                  <td className="mono">
                    {t.id}
                    <small>
                      {t.entryDate} → {t.exitDate}
                    </small>
                  </td>
                  <td className="mono">
                    {t.entry.toFixed(3)} → {t.exit.toFixed(3)}
                  </td>
                  <td>{t.direction}</td>
                  <td className="num mono">{money(t.gross)}</td>
                  <td className="num mono negative">{money(t.costs)}</td>
                  <td
                    className={`num mono ${t.net >= 0 ? "positive" : "negative"}`}
                  >
                    {money(t.net)}
                  </td>
                  <td>{t.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted-text">
          No qualifying trades were found for these parameters and this
          evaluation period.
        </p>
      )}
    </section>
  );
}
function Evidence({ run, onNavigate }) {
  if (!run)
    return (
      <>
        <Header
          eyebrow="EVIDENCE & VALIDATION"
          title="Evidence & validation"
          description="Audit the checks behind each simulated research conclusion."
        />
        <EmptyRun onNavigate={onNavigate} />
      </>
    );
  const checks = [
    {
      label: "Input observations",
      value: `${run.validation.sampleSize} records`,
      detail: "Validated and normalized",
      tone: "positive",
    },
    {
      label: "Double-cost sensitivity",
      value: money(run.doubleCostNetPnl),
      detail: "Calculated from current run",
      tone: run.doubleCostNetPnl >= 0 ? "positive" : "negative",
    },
    {
      label: "Statistical significance",
      value: "Not run",
      detail: "No significance test implemented",
      tone: "warning",
    },
    {
      label: "Strategy verdict",
      value: run.verdict,
      detail: "Kept conservative by design",
      tone: "warning",
    },
  ];
  return (
    <>
      <Header
        eyebrow="EVIDENCE & VALIDATION"
        title="Evidence & validation"
        description={`Actual validation evidence for ${run.id}.`}
      />
      <div className="metric-grid">
        {checks.map((c) => (
          <Metric key={c.label} {...c} />
        ))}
      </div>
      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Current observation sample</div>
            <h2>{run.period}</h2>
          </div>
          <Badge tone="demo">{run.observations.length} RECORDS</Badge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Spread</th>
                <th className="num">Volume</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {run.observations.map((o) => (
                <tr key={o.date}>
                  <td className="mono">{o.date}</td>
                  <td
                    className={`num mono ${o.spread >= 0 ? "positive" : "negative"}`}
                  >
                    {o.spread >= 0 ? "+" : ""}
                    {o.spread.toFixed(3)}%
                  </td>
                  <td className="num mono">
                    {Number(o.volume || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <Badge tone="demo">Synthetic feed</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <TradeTable run={run} />
    </>
  );
}
function Vault({ savedRuns, onOpen, onDelete, onNavigate, currentRun }) {
  return (
    <>
      <Header
        eyebrow="RESEARCH VAULT"
        title="Research vault"
        description="Saved simulation runs and their immutable calculation keys."
        action={
          <button
            className="button button-outline"
            onClick={() => onNavigate("Strategy Lab")}
          >
            <Plus /> New run
          </button>
        }
      />
      <section className="panel chart-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Pair</th>
                <th>Period</th>
                <th className="num">Net P&L</th>
                <th>Trades</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedRuns.map((run) => (
                <tr
                  key={run.id}
                  className={currentRun?.id === run.id ? "selected-row" : ""}
                >
                  <td className="mono">
                    <strong>{run.id}</strong>
                    {currentRun?.id === run.id && <small>Active run</small>}
                  </td>
                  <td>
                    {run.parameters.contractA} / {run.parameters.contractB}
                  </td>
                  <td>{run.period}</td>
                  <td
                    className={`num mono ${run.netPnl >= 0 ? "positive" : "negative"}`}
                  >
                    {money(run.netPnl)}
                  </td>
                  <td className="mono">{run.tradeCount}</td>
                  <td>
                    <button className="link-button" onClick={() => onOpen(run)}>
                      Open
                    </button>{" "}
                    <button
                      className="link-button negative"
                      onClick={() => onDelete(run.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  const [page, setPage] = useState("Overview");
  const [sidebar, setSidebar] = useState(true);
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [canonicalRun, setCanonicalRun] = useState(null);
  const [savedRuns, setSavedRuns] = useState(() =>
    readStoredRuns(typeof window === "undefined" ? null : window.localStorage),
  );
  const persist = (next) => {
    const validRuns = writeStoredRuns(window.localStorage, next);
    setSavedRuns(validRuns);
  };
  const onRun = (run) => {
    setCanonicalRun(run);
    persist(
      [
        run,
        ...savedRuns.filter(
          (item) => item.calculationKey !== run.calculationKey,
        ),
      ].slice(0, 12),
    );
  };
  const openRun = (run) => {
    setCanonicalRun(run);
    setPage("Backtest Results");
  };
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return [
      ...contracts.map((c) => ({
        label: c.symbol,
        detail: c.name,
        page: "Contract Explorer",
      })),
      ...savedRuns.map((r) => ({
        label: r.id,
        detail: r.parameters.contractA + " / " + r.parameters.contractB,
        page: "Research Vault",
      })),
    ]
      .filter((x) => `${x.label} ${x.detail}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, savedRuns]);
  const content =
    page === "Overview" ? (
      <Overview onNavigate={setPage} currentRun={canonicalRun} />
    ) : page === "Strategy Lab" ? (
      <HistoricalStrategyLab onNavigate={setPage} onRun={onRun} />
    ) : page === "Backtest Results" ? (
      <BacktestResults run={canonicalRun} onNavigate={setPage} />
    ) : page === "Evidence & Validation" ? (
      <Evidence run={canonicalRun} onNavigate={setPage} />
    ) : page === "Research Vault" ? (
      <Vault
        savedRuns={savedRuns}
        currentRun={canonicalRun}
        onOpen={openRun}
        onDelete={(id) => persist(savedRuns.filter((r) => r.id !== id))}
        onNavigate={setPage}
      />
    ) : (
      <>
        <Header
          eyebrow="CONTRACT EXPLORER"
          title="Contract explorer"
          description="Inspect normalized history and provisional specifications."
        />
        <div className="overview-grid">
          <section className="panel chart-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Contract</th>
                    <th>Lot</th>
                    <th>Price</th>
                    <th>Liquidity</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.symbol}>
                      <td className="mono">
                        <strong>{c.symbol}</strong>
                      </td>
                      <td>{c.name}</td>
                      <td>{c.lot}</td>
                      <td className="num mono">
                        ₹{c.price.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <Badge>{c.liquidity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel chart-panel">
            <h2>Spread history</h2>
            <SpreadChart />
          </section>
        </div>
      </>
    );
  return (
    <div className={dark ? "app dark" : "app light"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside
        className={`${sidebar ? "sidebar" : "sidebar collapsed"} mobile-sidebar-${sidebar ? "open" : "closed"}`}
      >
        <div className="brand" onClick={() => setPage("Overview")}>
          <div className="brand-mark">SF</div>
          {sidebar && (
            <div>
              <strong>SpreadForge</strong>
              <small>QUANT RESEARCH</small>
            </div>
          )}
        </div>
        <nav>
          {navItems.map(([label, Icon]) => (
            <button
              key={label}
              className={page === label ? "nav-item active" : "nav-item"}
              onClick={() => {
                setPage(label);
                if (window.innerWidth < 760) setSidebar(false);
              }}
              title={!sidebar ? label : ""}
            >
              <Icon />
              {sidebar && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setSidebar(!sidebar)}>
            <PanelLeftClose />
            {sidebar && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="top-search">
            <Search />
            <input
              aria-label="Search contracts, runs, reports"
              placeholder="Search contracts, runs, reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <div className="search-results">
                {searchResults.length ? (
                  searchResults.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => {
                        setPage(r.page);
                        setSearch("");
                      }}
                    >
                      <strong>{r.label}</strong>
                      <span>{r.detail}</span>
                    </button>
                  ))
                ) : (
                  <span className="search-empty">No matching demo records</span>
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setDark(!dark)}
              aria-label="Toggle theme"
            >
              {dark ? <Sun /> : <Moon />}
            </button>
            <button
              className="avatar"
              aria-label="Open research analyst profile"
              onClick={() => setProfileOpen(true)}
            >
              AR
            </button>
          </div>
        </header>
        <main id="main" className="content">
          {content}
        </main>
      </div>
      {profileOpen && (
        <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Research analyst profile"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              onClick={() => setProfileOpen(false)}
              aria-label="Close profile"
            >
              <X />
            </button>
            <div className="avatar large">AR</div>
            <div className="eyebrow">RESEARCH ANALYST</div>
            <h2>Aarav Rao</h2>
            <p>SpreadForge demo workspace</p>
            <div className="profile-row">
              <span>Environment</span>
              <strong>Synthetic data</strong>
            </div>
            <div className="profile-row">
              <span>Saved runs</span>
              <strong>{savedRuns.length}</strong>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
