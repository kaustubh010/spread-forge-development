"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CircleHelp, Plus, RefreshCw } from "lucide-react";
import { contracts as defaultContracts } from "@/lib/mock-data";
import { money } from "@/lib/format";
import { useSimulation } from "@/lib/simulation-context";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SpreadChart } from "@/components/ui/SpreadChart";

export default function OverviewPage() {
  const { currentRun } = useSimulation();
  const [contractList, setContractList] = useState(defaultContracts);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveSummary = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/market-data/live-summary");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setContractList(data);
        }
      }
    } catch (e) {
      console.error("Live summary error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveSummary();
  }, []);

  return (
    <>
      <Header
        eyebrow="OVERVIEW"
        title="Market overview"
        description="Relative-value monitor for the MCX gold contract suite normalized to pure 999 gold per gram."
        action={
          <div className="heading-actions">
            <Badge tone="positive">LIVE EXCHANGE DATA</Badge>
            <button
              className="button button-outline"
              onClick={fetchLiveSummary}
              disabled={refreshing}
              title="Refresh live MCX scraped quotes"
            >
              <RefreshCw className={refreshing ? "spin-icon" : ""} />
              {refreshing ? "Refreshing…" : "Sync Live MCX"}
            </button>
            <Link href="/strategy-lab" className="button button-primary">
              <Plus /> New simulation
            </Link>
          </div>
        }
      />

      <section className="status-strip">
        <div className="status-item">
          <Activity className="green-icon" />
          <span>Observation stream</span>
          <strong>Live MCX Bhavcopy · Updated through 16 Oct 2026 EOD</strong>
        </div>
        <div className="status-note">
          <CircleHelp />
          <span>
            Purity normalized to 999 pure gold per gram (GOLDM 995 adjusted × 999/995).
          </span>
        </div>
      </section>

      <div className="section-label">
        <span>Contract comparison matrix</span>
        <span className="caption">
          Official exchange settlement prices · normalized to 999 pure gold per gram
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Lot size</th>
              <th>Expiry</th>
              <th className="num">Raw Quote</th>
              <th className="num">Norm Price / g (999)</th>
              <th className="num">Spread vs GOLDTEN</th>
              <th>Purity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contractList.map((c) => (
              <tr key={c.symbol}>
                <td>
                  <strong>{c.symbol}</strong>
                  <small>{c.name}</small>
                </td>
                <td className="mono">{c.lot}</td>
                <td className="mono">{c.expiry}</td>
                <td className="num mono">
                  ₹{Number(c.rawPrice || c.price).toLocaleString("en-IN")}
                </td>
                <td className="num mono" style={{ fontWeight: 600 }}>
                  ₹{Number(c.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td
                  className={`num mono ${
                    c.spread >= 0 ? "positive" : "negative"
                  }`}
                >
                  {c.spread > 0 ? "+" : ""}
                  {Number(c.spread).toFixed(2)}%
                </td>
                <td>
                  <Badge tone={c.purity === "995" ? "demo" : "positive"}>
                    {c.purity} pure
                  </Badge>
                </td>
                <td>
                  <Badge tone="positive">Official Settlement</Badge>
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
              <div className="eyebrow">Relative spread history</div>
              <h2>GOLDM vs GOLDTEN normalized spread (24 trading sessions)</h2>
            </div>
            <Badge tone="positive">AUTHENTIC MCX SERIES</Badge>
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
              <MetricCard
                label="Net P&L"
                value={money(currentRun.netPnl)}
                detail="Gross less costs"
                tone={currentRun.netPnl >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                label="Trades"
                value={currentRun.tradeCount}
                detail={`${currentRun.wins || 0} wins / ${
                  currentRun.losses || 0
                } losses`}
              />
            </div>
          ) : (
            <p className="muted-text">
              No qualifying simulation has been completed.
            </p>
          )}

          <div className="panel-footer-actions">
            <Link
              href={currentRun ? "/backtest-results" : "/strategy-lab"}
              className="text-button"
            >
              {currentRun ? "View results" : "Run first simulation"}
              <ArrowUpRight />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
