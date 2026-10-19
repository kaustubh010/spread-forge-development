"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyRun } from "@/components/ui/EmptyRun";
import { TradeTable } from "@/components/ui/TradeTable";
import { money } from "@/lib/format";
import { useSimulation } from "@/lib/simulation-context";

export default function BacktestResultsPage() {
  const { currentRun } = useSimulation();

  if (!currentRun) {
    return (
      <>
        <Header
          eyebrow="BACKTEST RESULTS"
          title="Backtest results"
          description="Review the canonical output of the selected simulation."
        />
        <EmptyRun />
      </>
    );
  }

  return (
    <>
      <Header
        eyebrow="BACKTEST RESULTS"
        title="Backtest results"
        description={`Canonical output for ${currentRun.id} · ${currentRun.period}`}
        action={<Badge tone="demo">{currentRun.calculationKey}</Badge>}
      />

      <div className="metric-grid">
        <MetricCard
          label="Net P&L"
          value={money(currentRun.netPnl)}
          detail={`Gross ${money(currentRun.grossPnl)} − costs ${money(
            currentRun.totalCosts,
          )}`}
          tone={currentRun.netPnl >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="Win rate"
          value={currentRun.winRate == null ? "—" : `${currentRun.winRate}%`}
          detail={`${currentRun.tradeCount} completed trades`}
        />
        <MetricCard
          label="Max drawdown"
          value={money(currentRun.maxDrawdown)}
          detail="Realized equity peak-to-trough"
          tone="negative"
        />
        <MetricCard
          label="Sharpe ratio"
          value={currentRun.sharpe == null ? "Not available" : currentRun.sharpe}
          detail="Requires suitable return series"
        />
      </div>

      <section className="panel chart-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Realized equity curve</div>
            <h2>Final equity {money(currentRun.equity?.at(-1)?.value)}</h2>
          </div>
          <Badge tone={currentRun.netPnl >= 0 ? "positive" : "negative"}>
            {currentRun.tradeCount} TRADES
          </Badge>
        </div>

        {currentRun.equity?.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={currentRun.equity}
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
                minTickGap={35}
              />
              <YAxis
                tick={{ fill: "var(--muted-text)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel-2)",
                  borderColor: "var(--line)",
                  borderRadius: "4px",
                  color: "var(--text)",
                  fontSize: "11px",
                  fontFamily: "var(--mono)",
                }}
                formatter={(val) => [money(val), "Cumulative Equity"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="color-mix(in srgb, var(--accent) 15%, transparent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted-text">No equity history available for this run.</p>
        )}
      </section>

      <TradeTable run={currentRun} />
    </>
  );
}
