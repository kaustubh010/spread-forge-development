"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, CircleHelp, Plus } from "lucide-react";
import { contracts } from "@/lib/mock-data";
import { money } from "@/lib/format";
import { useSimulation } from "@/lib/simulation-context";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SpreadChart } from "@/components/ui/SpreadChart";

export default function OverviewPage() {
  const { currentRun } = useSimulation();

  return (
    <>
      <Header
        eyebrow="OVERVIEW"
        title="Market overview"
        description="Relative-value monitor for the provisional MCX gold contract universe."
        action={
          <div className="heading-actions">
            <Badge tone="demo">DEMO DATA</Badge>
            <Link href="/strategy-lab" className="button button-outline">
              <Plus /> New simulation
            </Link>
          </div>
        }
      />

      <section className="status-strip">
        <div className="status-item">
          <Activity className="green-icon" />
          <span>Observation stream</span>
          <strong>Simulated · current through 14:32 IST</strong>
        </div>
        <div className="status-note">
          <CircleHelp />
          <span>Contract specifications are provisional working assumptions.</span>
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
                  className={`num mono ${
                    c.spread >= 0 ? "positive" : "negative"
                  }`}
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
            <Badge tone="positive">ACTIVE SPREAD</Badge>
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
