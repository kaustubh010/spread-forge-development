"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/format";
import { useSimulation } from "@/lib/simulation-context";

export default function ResearchVaultPage() {
  const router = useRouter();
  const { savedRuns, currentRun, setCurrentRun, deleteRun } = useSimulation();

  const handleOpen = (run) => {
    setCurrentRun(run);
    router.push("/backtest-results");
  };

  return (
    <>
      <Header
        eyebrow="RESEARCH VAULT"
        title="Research vault"
        description="Saved simulation runs and their immutable calculation keys."
        action={
          <Link href="/strategy-lab" className="button button-outline">
            <Plus /> New run
          </Link>
        }
      />

      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Simulation archive</div>
            <h2>{savedRuns.length} preserved runs</h2>
          </div>
          <Badge tone="demo">PERSISTENT REPOSITORY</Badge>
        </div>

        {savedRuns.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Pair</th>
                  <th>Period</th>
                  <th className="num">Net P&L</th>
                  <th>Trades</th>
                  <th>Calculation key</th>
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
                      {currentRun?.id === run.id && (
                        <small className="active-badge">Active run</small>
                      )}
                    </td>
                    <td>
                      {run.parameters?.contractA || "A"} /{" "}
                      {run.parameters?.contractB || "B"}
                    </td>
                    <td>{run.period}</td>
                    <td
                      className={`num mono ${
                        run.netPnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {money(run.netPnl)}
                    </td>
                    <td className="mono">{run.tradeCount}</td>
                    <td className="mono muted-text">
                      <small>{run.calculationKey}</small>
                    </td>
                    <td>
                      <div className="table-row-actions">
                        <button
                          className="link-button"
                          onClick={() => handleOpen(run)}
                        >
                          Open
                        </button>
                        <button
                          className="link-button negative"
                          onClick={() => deleteRun(run.id)}
                          title="Delete saved run"
                        >
                          <Trash2 className="action-icon" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel">
            <h2>No saved simulations</h2>
            <p>
              Execute a simulation in Strategy Lab to populate and preserve
              immutable backtest records in the vault.
            </p>
            <Link href="/strategy-lab" className="button button-primary">
              <Plus /> Create simulation
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
