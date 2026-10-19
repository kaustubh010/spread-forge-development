import { Badge } from "./Badge";
import { money } from "@/lib/format";

export function TradeTable({ run, title = "Trade ledger", subtitle = "Closed trades" }) {
  if (!run?.trades) return null;

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{title}</div>
          <h2>{subtitle}</h2>
        </div>
        <Badge tone="demo">{run.trades.length} ROWS</Badge>
      </div>
      {run.trades.length > 0 ? (
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
                    <strong>{t.id}</strong>
                    <small>
                      {t.entryDate} → {t.exitDate}
                    </small>
                  </td>
                  <td className="mono">
                    {t.entry.toFixed(3)} → {t.exit.toFixed(3)}
                  </td>
                  <td>
                    <Badge tone={t.direction === "SHORT_A_LONG_B" ? "warning" : "positive"}>
                      {t.direction}
                    </Badge>
                  </td>
                  <td className="num mono">{money(t.gross)}</td>
                  <td className="num mono negative">{money(t.costs)}</td>
                  <td
                    className={`num mono ${t.net >= 0 ? "positive" : "negative"}`}
                  >
                    {money(t.net)}
                  </td>
                  <td>
                    <span className="exit-tag">{t.exitReason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted-text empty-table-text">
          No qualifying trades were found for these parameters and this evaluation period.
        </p>
      )}
    </section>
  );
}
