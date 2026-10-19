"use client";

import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyRun } from "@/components/ui/EmptyRun";
import { TradeTable } from "@/components/ui/TradeTable";
import { money } from "@/lib/format";
import { useSimulation } from "@/lib/simulation-context";

export default function EvidenceValidationPage() {
  const { currentRun } = useSimulation();

  if (!currentRun) {
    return (
      <>
        <Header
          eyebrow="EVIDENCE & VALIDATION"
          title="Evidence & validation"
          description="Audit the checks behind each simulated research conclusion."
        />
        <EmptyRun />
      </>
    );
  }

  const checks = [
    {
      label: "Input observations",
      value: `${
        currentRun.validation?.sampleSize || currentRun.observations?.length || 0
      } records`,
      detail: "Validated and normalized",
      tone: "positive",
    },
    {
      label: "Double-cost sensitivity",
      value: money(currentRun.doubleCostNetPnl),
      detail: "Calculated from current run",
      tone: currentRun.doubleCostNetPnl >= 0 ? "positive" : "negative",
    },
    {
      label: "Statistical significance",
      value: "Not run",
      detail: "No significance test implemented",
      tone: "warning",
    },
    {
      label: "Strategy verdict",
      value: currentRun.verdict || "Provisional",
      detail: "Kept conservative by design",
      tone: "warning",
    },
  ];

  return (
    <>
      <Header
        eyebrow="EVIDENCE & VALIDATION"
        title="Evidence & validation"
        description={`Actual validation evidence and sensitivity checks for ${currentRun.id}.`}
      />

      <div className="metric-grid">
        {checks.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>

      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Current observation sample</div>
            <h2>{currentRun.period}</h2>
          </div>
          <Badge tone="demo">{currentRun.observations?.length || 0} RECORDS</Badge>
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
              {currentRun.observations?.slice(0, 50).map((o, idx) => (
                <tr key={`${o.date}-${idx}`}>
                  <td className="mono">{o.date}</td>
                  <td
                    className={`num mono ${
                      o.spread >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {o.spread >= 0 ? "+" : ""}
                    {Number(o.spread).toFixed(3)}%
                  </td>
                  <td className="num mono">
                    {Number(o.volume || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <Badge tone="demo">{currentRun.dataSource || "Synthetic feed"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TradeTable run={currentRun} />
    </>
  );
}
