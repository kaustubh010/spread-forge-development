"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { spreadSeries } from "@/lib/mock-data";

export function SpreadChart({ data = spreadSeries, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
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
          tickFormatter={(v) => v?.slice(5) || ""}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: "var(--muted-text)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
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
          formatter={(value) => [`${Number(value).toFixed(2)}%`, "Spread"]}
          labelStyle={{ color: "var(--muted-text)", marginBottom: "4px" }}
        />
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
