import { observations } from "./mock-data.js";

// Illustrative synthetic proxy only; this is not an official MCX contract multiplier.
export const SPREAD_NOTIONAL = 7200;

function finiteNumber(value, label, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(
      `${label} must be a finite number greater than or equal to ${minimum}.`,
    );
  }
  return parsed;
}

function normalizeObservations(input) {
  if (!Array.isArray(input) || input.length < 2)
    throw new Error("At least two observations are required.");
  return input.map((point, index) => {
    const spread = Number(point?.spread);
    if (!point?.date || !Number.isFinite(spread))
      throw new Error(
        `Observation ${index + 1} has a missing or invalid spread.`,
      );
    return { ...point, spread };
  });
}

function stableKey(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1)
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `CALC-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

/**
 * Chronological, non-overlapping spread-reversion simulation.
 * Spread is defined as contract A minus contract B. Positive entries therefore
 * mean short A / long B for reversion; negative entries mean long A / short B.
 * An entry occurs only on a crossing from inside the entry band. A position exits
 * on a later observation inside the exit band, or at the final observation using
 * the explicit `End of evaluation period` rule. Because the dataset contains no
 * executable contract prices, P&L is a clearly labelled synthetic spread-unit
 * proxy: absolute spread movement × a fixed illustrative notional.
 * Transaction costs are one fixed amount per completed round trip; slippage is
 * an additional percentage of the synthetic spread movement, not exchange fees.
 */
export function simulateRun(input = {}) {
  const contractA = input.contractA || "GOLDM";
  const contractB = input.contractB || "GOLDTEN";
  if (contractA === contractB)
    throw new Error("Contract A and Contract B must be different.");
  const entryThreshold = finiteNumber(
    input.entryThreshold ?? 0.35,
    "Entry threshold",
  );
  const exitThreshold = finiteNumber(
    input.exitThreshold ?? 0.08,
    "Exit threshold",
  );
  if (entryThreshold <= exitThreshold)
    throw new Error("Entry threshold must be greater than exit threshold.");
  const transactionCosts = finiteNumber(
    input.transactionCosts ?? 420,
    "Transaction costs",
  );
  const slippage = finiteNumber(input.slippage ?? 0.04, "Slippage");
  const lookback = Math.floor(
    finiteNumber(input.lookback ?? 20, "Lookback observations", 1),
  );
  const requested = input.observations || observations;
  const normalized = normalizeObservations(requested);
  const source = normalized.slice(-Math.min(normalized.length, lookback));
  if (source.length < 2)
    throw new Error(
      "At least two observations are required for the evaluation period.",
    );

  const trades = [];
  let open = null;
  source.forEach((point, index) => {
    const previous = source[index - 1];
    const absoluteSpread = Math.abs(point.spread);
    if (
      !open &&
      previous &&
      Math.abs(previous.spread) < entryThreshold &&
      absoluteSpread >= entryThreshold
    ) {
      open = {
        entryIndex: index,
        entryPoint: point,
        sign: point.spread >= 0 ? 1 : -1,
      };
      return;
    }
    if (!open || index <= open.entryIndex) return;
    const crossedBackThroughZero =
      Math.sign(point.spread) !== open.sign && point.spread !== 0;
    const reachedExit =
      absoluteSpread <= exitThreshold || crossedBackThroughZero;
    const atEnd = index === source.length - 1;
    if (!reachedExit && !atEnd) return;
    const movement =
      open.sign * (open.entryPoint.spread - point.spread) * SPREAD_NOTIONAL;
    const grossPnl = Math.round(movement);
    const slippageCost = Math.round(Math.abs(movement) * (slippage / 100));
    const costs = transactionCosts + slippageCost;
    trades.push({
      id: `T-${String(trades.length + 1).padStart(3, "0")}`,
      entryDate: open.entryPoint.date,
      exitDate: point.date,
      date: point.date,
      direction:
        open.sign > 0
          ? `Short ${contractA} / Long ${contractB}`
          : `Long ${contractA} / Short ${contractB}`,
      entry: Number(open.entryPoint.spread.toFixed(3)),
      exit: Number(point.spread.toFixed(3)),
      gross: grossPnl,
      transactionCosts,
      slippageCost,
      costs,
      net: grossPnl - costs,
      exitReason: reachedExit
        ? "Exit threshold reached"
        : "End of evaluation period",
    });
    open = null;
  });

  const grossPnl = trades.reduce((sum, trade) => sum + trade.gross, 0);
  const totalCosts = trades.reduce((sum, trade) => sum + trade.costs, 0);
  const netPnl = trades.reduce((sum, trade) => sum + trade.net, 0);
  const equity = [{ date: source[0].date, value: 0 }];
  trades.forEach((trade) =>
    equity.push({
      date: trade.exitDate,
      value: equity.at(-1).value + trade.net,
    }),
  );
  let peak = equity[0].value;
  let maxDrawdown = 0;
  equity.forEach((point) => {
    peak = Math.max(peak, point.value);
    maxDrawdown = Math.min(maxDrawdown, point.value - peak);
  });
  const wins = trades.filter((trade) => trade.net > 0).length;
  const losses = trades.filter((trade) => trade.net < 0).length;
  const breakEven = trades.filter((trade) => trade.net === 0).length;
  const denominator = wins + losses;
  const parameters = {
    contractA,
    contractB,
    entryThreshold,
    exitThreshold,
    transactionCosts,
    slippage,
    lookback,
  };
  const calculationKey = stableKey({ parameters, source });
  return {
    id: `SF-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    calculationKey,
    synthetic: true,
    assumptions: {
      pnlModel: "Synthetic spread-unit proxy",
      notional: SPREAD_NOTIONAL,
      costModel:
        "Fixed round-trip cost plus slippage percentage of absolute spread movement",
      sharpe: "Unavailable without a suitable return series and frequency",
    },
    parameters,
    period: `${source[0].date} — ${source.at(-1).date}`,
    observations: source,
    trades,
    equity,
    grossPnl,
    totalCosts,
    netPnl,
    doubleCostNetPnl: grossPnl - 2 * totalCosts,
    tradeCount: trades.length,
    wins,
    losses,
    breakEven,
    winRate: denominator
      ? Number(((wins / denominator) * 100).toFixed(1))
      : null,
    maxDrawdown,
    sharpe: null,
    verdict: "Inconclusive",
    validation: {
      sampleSize: source.length,
      period: `${source[0].date} — ${source.at(-1).date}`,
      checks: {
        doubleCostSensitivity: "Calculated",
        statisticalSignificance: "Not run",
      },
    },
  };
}
