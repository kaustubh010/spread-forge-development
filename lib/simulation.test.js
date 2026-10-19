import test from "node:test";
import assert from "node:assert/strict";
import { simulateRun } from "./simulation.js";

const run = (spreads, extra = {}) =>
  simulateRun({
    observations: spreads.map((spread, index) => ({
      date: `2024-01-${String(index + 1).padStart(2, "0")}`,
      spread,
    })),
    transactionCosts: 10,
    slippage: 0,
    lookback: spreads.length,
    ...extra,
  });

test("enters and exits a positive spread reversion", () => {
  const result = run([0.1, 0.4, 0.2, 0.05]);
  assert.equal(result.tradeCount, 1);
  assert.equal(result.trades[0].direction, "Short GOLDM / Long GOLDTEN");
  assert.equal(result.trades[0].exitReason, "Exit threshold reached");
});

test("enters and exits a negative spread reversion", () => {
  const result = run([-0.1, -0.4, -0.2, -0.05]);
  assert.equal(result.trades[0].direction, "Long GOLDM / Short GOLDTEN");
  assert.equal(result.trades[0].gross, 2520);
});

test("supports profitable and losing end-of-period trades", () => {
  assert.ok(run([0.1, 0.4, 0.05]).trades[0].gross > 0);
  const losing = run([0.1, 0.4, 0.5]);
  assert.ok(losing.trades[0].gross < 0);
  assert.equal(losing.trades[0].exitReason, "End of evaluation period");
});

test("reconciles transaction costs and doubles fixed plus slippage costs", () => {
  const result = run([0.1, 0.4, 0.05], { transactionCosts: 10, slippage: 1 });
  assert.ok(result.trades[0].slippageCost > 0);
  assert.equal(
    result.trades[0].net,
    result.trades[0].gross - result.trades[0].costs,
  );
  assert.equal(result.netPnl, result.grossPnl - result.totalCosts);
  assert.equal(
    result.doubleCostNetPnl,
    result.grossPnl - 2 * result.totalCosts,
  );
});

test("returns an explicit no-trade result", () =>
  assert.equal(run([0.1, 0.2, 0.15]).tradeCount, 0));
test("rejects insufficient observations and invalid parameters", () => {
  assert.throws(() => run([0.1]), /At least two observations/);
  assert.throws(
    () => run([0.1, 0.4], { entryThreshold: 0.1, exitThreshold: 0.2 }),
    /greater than exit/,
  );
  assert.throws(() => run([0.1, NaN]), /invalid spread/);
});
test("is deterministic apart from its unique run id", () => {
  const first = run([0.1, 0.4, 0.05]);
  const second = run([0.1, 0.4, 0.05]);
  assert.equal(first.calculationKey, second.calculationKey);
  assert.deepEqual({ ...first, id: undefined }, { ...second, id: undefined });
});
test("reconciles equity and drawdown from the documented realized ledger", () => {
  const result = run([0.1, 0.4, 0.05, 0.4, 0.5]);
  assert.equal(result.equity.at(-1).value, result.netPnl);
  assert.deepEqual(
    result.equity.map((point) => point.value),
    [0, result.trades[0].net, result.netPnl],
  );
  assert.ok(result.maxDrawdown <= 0);
});

test("supports multiple sequential trades with correct dates", () => {
  const result = run([0.1, 0.4, 0.05, 0.1, -0.4, -0.05]);
  assert.equal(result.tradeCount, 2);
  assert.deepEqual(
    result.trades.map((trade) => [trade.entryDate, trade.exitDate]),
    [
      ["2024-01-02", "2024-01-03"],
      ["2024-01-05", "2024-01-06"],
    ],
  );
  assert.equal(result.trades[1].direction, "Long GOLDM / Short GOLDTEN");
});

test("holds a position across observations and exits on a sign change", () => {
  const result = run([0.1, 0.4, 0.3, 0.2, -0.1]);
  assert.equal(result.tradeCount, 1);
  assert.equal(result.trades[0].entryDate, "2024-01-02");
  assert.equal(result.trades[0].exitDate, "2024-01-05");
  assert.equal(result.trades[0].exitReason, "Exit threshold reached");
  assert.ok(result.trades[0].gross > 0);
});

test("does not create a completed trade when the entry occurs on the final observation", () => {
  const result = run([0.1, 0.4]);
  assert.equal(result.tradeCount, 0);
  assert.equal(result.netPnl, 0);
});

test("supports break-even trades and ledger reconciliation", () => {
  const result = run([0.1, 0.4, 0.4]);
  assert.equal(result.tradeCount, 1);
  assert.equal(result.trades[0].gross, 0);
  assert.equal(result.trades[0].net, -10);
  assert.equal(
    result.grossPnl,
    result.trades.reduce((sum, trade) => sum + trade.gross, 0),
  );
  assert.equal(
    result.totalCosts,
    result.trades.reduce((sum, trade) => sum + trade.costs, 0),
  );
  assert.equal(
    result.netPnl,
    result.trades.reduce((sum, trade) => sum + trade.net, 0),
  );
});
