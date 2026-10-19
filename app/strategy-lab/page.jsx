"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Play, Settings2, ShieldCheck } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { money } from "@/lib/format";
import { simulateRun } from "@/lib/simulation";
import { useSimulation } from "@/lib/simulation-context";
import {
  CONTRACTS,
  PERIODS,
  alignHistoricalSeries,
  fetchHistoricalSeries,
  toSimulationObservations,
} from "@/lib/market-data";
import { contracts, observations as mockObservations } from "@/lib/mock-data";

export default function StrategyLabPage() {
  const router = useRouter();
  const { saveRun } = useSimulation();

  const [mode, setMode] = useState("historical"); // 'historical' | 'synthetic'
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
  const [syntheticResult, setSyntheticResult] = useState(null);

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
      setError(e.message || "Failed to fetch historical series.");
    } finally {
      setLoading(false);
    }
  };

  const runHistorical = () => {
    if (!series?.observations?.length) {
      return setError(
        "Fetch and validate historical data before running the backtest.",
      );
    }
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

      const fullResult = {
        ...result,
        dataSource: "Historical market data",
        validation: {
          ...result.validation,
          matchedObservations: series.observations.length,
          excludedRecords: series.aligned.excludedCount,
          missingDates: series.aligned.missing,
        },
      };

      saveRun(fullResult);
      setStatus("Backtest completed from validated historical observations.");
    } catch (e) {
      setError(e.message);
    }
  };

  const runSynthetic = () => {
    setError("");
    if (params.contractA === params.contractB) {
      return setError("Contract A and Contract B must be different.");
    }
    if (Number(params.entryThreshold) <= Number(params.exitThreshold)) {
      return setError("Entry threshold must be greater than exit threshold.");
    }
    if (
      ![
        params.entryThreshold,
        params.exitThreshold,
        params.transactionCosts,
        params.slippage,
        params.lookback,
      ].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0)
    ) {
      return setError("Use valid non-negative numeric values.");
    }

    setLoading(true);
    setTimeout(() => {
      try {
        const result = simulateRun({
          ...params,
          observations: mockObservations,
          entryThreshold: Number(params.entryThreshold),
          exitThreshold: Number(params.exitThreshold),
          transactionCosts: Number(params.transactionCosts),
          slippage: Number(params.slippage),
          lookback: Number(params.lookback),
          dataSource: "Synthetic feed",
        });
        setSyntheticResult(result);
        saveRun(result);
        setStatus(`Simulation ${result.id} completed successfully.`);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  return (
    <>
      <Header
        eyebrow="STRATEGY LAB"
        title="Strategy lab"
        description="Configure parameters and validate market observations for quantitative spread simulation."
        action={
          <div className="heading-actions">
            <button
              className={`button ${mode === "historical" ? "button-primary" : "button-outline"}`}
              onClick={() => {
                setMode("historical");
                setError("");
                setStatus("");
              }}
            >
              Historical Data
            </button>
            <button
              className={`button ${mode === "synthetic" ? "button-primary" : "button-outline"}`}
              onClick={() => {
                setMode("synthetic");
                setError("");
                setStatus("");
              }}
            >
              Synthetic Simulator
            </button>
          </div>
        }
      />

      {mode === "historical" ? (
        <>
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Historical data selection</div>
                <h2>Mean-reversion setup</h2>
              </div>
              <Settings2 className="settings-icon" />
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
                  inputMode="decimal"
                  value={params.entryThreshold}
                  onChange={(e) => update("entryThreshold", e.target.value)}
                />
              </label>

              <label>
                <span>Exit threshold</span>
                <input
                  inputMode="decimal"
                  value={params.exitThreshold}
                  onChange={(e) => update("exitThreshold", e.target.value)}
                />
              </label>

              <label>
                <span>Costs / round trip (₹)</span>
                <input
                  inputMode="decimal"
                  value={params.transactionCosts}
                  onChange={(e) => update("transactionCosts", e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="button button-outline"
                onClick={fetchData}
                disabled={loading || params.contractA === params.contractB}
              >
                {loading ? "Fetching…" : "Fetch Historical Data"}
              </button>
              <button
                className="button button-primary"
                onClick={runHistorical}
                disabled={loading || !series?.observations?.length}
              >
                <Play /> Run Backtest
              </button>
            </div>

            {error && <div className="inline-error">{error}</div>}
            {status && (
              <div className="inline-success">
                <ShieldCheck />
                <span>{status}</span>
                <button
                  className="link-button"
                  onClick={() => router.push("/backtest-results")}
                >
                  View backtest results <ArrowUpRight />
                </button>
              </div>
            )}

            <p className="caption">
              Historical series is fetched through the configured market data API.
              Rollover and contract specifications must be verified prior to live deployment.
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
      ) : (
        <div className="lab-grid">
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Simulation parameters</div>
                <h2>Synthetic setup</h2>
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
                  {contracts.map((c) => (
                    <option key={c.symbol}>{c.symbol}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Contract B</span>
                <select
                  value={params.contractB}
                  onChange={(e) => update("contractB", e.target.value)}
                >
                  {contracts.map((c) => (
                    <option key={c.symbol}>{c.symbol}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Entry threshold</span>
                <input
                  inputMode="decimal"
                  value={params.entryThreshold}
                  onChange={(e) => update("entryThreshold", e.target.value)}
                />
              </label>

              <label>
                <span>Exit threshold</span>
                <input
                  inputMode="decimal"
                  value={params.exitThreshold}
                  onChange={(e) => update("exitThreshold", e.target.value)}
                />
              </label>

              <label>
                <span>Costs / round trip (₹)</span>
                <input
                  inputMode="decimal"
                  value={params.transactionCosts}
                  onChange={(e) => update("transactionCosts", e.target.value)}
                />
              </label>

              <label>
                <span>Slippage %</span>
                <input
                  inputMode="decimal"
                  value={params.slippage}
                  onChange={(e) => update("slippage", e.target.value)}
                />
              </label>

              <label>
                <span>Lookback observations</span>
                <input
                  inputMode="decimal"
                  value={params.lookback}
                  onChange={(e) => update("lookback", e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="button button-primary"
                onClick={runSynthetic}
                disabled={loading}
              >
                <Play /> {loading ? "Running…" : "Run simulation"}
              </button>
              <button
                className="button button-ghost"
                onClick={() => {
                  setSyntheticResult(null);
                  setError("");
                  setStatus("");
                }}
              >
                Reset
              </button>
            </div>

            {error && <div className="inline-error">{error}</div>}
            {syntheticResult && (
              <div className="inline-success">
                <ShieldCheck />
                <span>
                  {syntheticResult.id} completed from{" "}
                  {syntheticResult.observations.length} observations.
                </span>
                <button
                  className="link-button"
                  onClick={() => router.push("/backtest-results")}
                >
                  View results <ArrowUpRight />
                </button>
              </div>
            )}
          </section>

          <section className="panel lab-aside">
            <div className="eyebrow">Canonical output</div>
            {syntheticResult ? (
              <div className="metric-grid compact-metrics">
                <MetricCard
                  label="Net P&L"
                  value={money(syntheticResult.netPnl)}
                  detail="Gross less total costs"
                  tone={syntheticResult.netPnl >= 0 ? "positive" : "negative"}
                />
                <MetricCard
                  label="Trades"
                  value={syntheticResult.tradeCount}
                  detail={
                    syntheticResult.tradeCount
                      ? `${syntheticResult.wins} wins / ${syntheticResult.losses} losses`
                      : "No qualifying trades"
                  }
                />
              </div>
            ) : (
              <p className="muted-text">
                The exact result object feeds every research screen. Run a simulation to inspect.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
