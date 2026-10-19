"use client";

import { contracts } from "@/lib/mock-data";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { SpreadChart } from "@/components/ui/SpreadChart";

export default function ContractExplorerPage() {
  return (
    <>
      <Header
        eyebrow="CONTRACT EXPLORER"
        title="Contract explorer"
        description="Inspect normalized history and provisional specifications across the MCX gold contract suite."
      />

      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Specifications</div>
              <h2>Provisional contract specifications</h2>
            </div>
            <Badge tone="demo">MCX GOLD SUITE</Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Contract</th>
                  <th>Lot</th>
                  <th className="num">Price</th>
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
                    <td className="mono">{c.lot}</td>
                    <td className="num mono">
                      ₹{c.price.toLocaleString("en-IN")}
                    </td>
                    <td>
                      <Badge tone={c.liquidity === "High" ? "positive" : "demo"}>
                        {c.liquidity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Spread dynamics</div>
              <h2>Normalized spread history</h2>
            </div>
          </div>
          <SpreadChart height={280} />
        </section>
      </div>
    </>
  );
}
