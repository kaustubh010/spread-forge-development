"use client";

import { useEffect, useState } from "react";
import { contracts as defaultContracts } from "@/lib/mock-data";
import { Header } from "@/components/ui/Header";
import { Badge } from "@/components/ui/Badge";
import { SpreadChart } from "@/components/ui/SpreadChart";

export default function ContractExplorerPage() {
  const [contractList, setContractList] = useState(defaultContracts);

  useEffect(() => {
    fetch("/api/market-data/live-summary")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setContractList(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <>
      <Header
        eyebrow="CONTRACT EXPLORER"
        title="Contract explorer"
        description="Inspect normalized history, official exchange settlement prices, and contract specifications across the MCX gold suite."
        action={<Badge tone="positive">LIVE EXCHANGE DATA</Badge>}
      />

      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Specifications &amp; Live Settlement</div>
              <h2>MCX Gold Futures Suite</h2>
            </div>
            <Badge tone="demo">MCX OFFICIAL</Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Contract</th>
                  <th>Lot</th>
                  <th>Expiry</th>
                  <th className="num">Raw Price</th>
                  <th className="num">Norm / g (999)</th>
                  <th>Purity</th>
                  <th>Liquidity</th>
                </tr>
              </thead>
              <tbody>
                {contractList.map((c) => (
                  <tr key={c.symbol}>
                    <td className="mono">
                      <strong>{c.symbol}</strong>
                    </td>
                    <td>{c.name}</td>
                    <td className="mono">{c.lot}</td>
                    <td className="mono">{c.expiry}</td>
                    <td className="num mono">
                      ₹{Number(c.rawPrice || c.price).toLocaleString("en-IN")}
                    </td>
                    <td className="num mono" style={{ fontWeight: 600 }}>
                      ₹{Number(c.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <Badge tone={c.purity === "995" ? "demo" : "positive"}>
                        {c.purity} pure
                      </Badge>
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
              <h2>Normalized spread history (24 sessions)</h2>
            </div>
            <Badge tone="positive">LIVE MCX</Badge>
          </div>
          <SpreadChart height={280} />
        </section>
      </div>
    </>
  );
}
