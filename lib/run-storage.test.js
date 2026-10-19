import test from "node:test";
import assert from "node:assert/strict";
import { readStoredRuns, writeStoredRuns } from "./run-storage.js";

const storage = (value) => ({
  getItem: () => value,
  setItem: (_, next) => {
    storage.written = next;
  },
});

const validRun = {
  id: "SF-ONE",
  calculationKey: "CALC-ONE",
  parameters: { contractA: "GOLDM" },
  observations: [{ date: "2024-01-01", spread: 0.1 }],
  trades: [],
  equity: [{ date: "2024-01-01", value: 0 }],
  grossPnl: 0,
  totalCosts: 0,
  netPnl: 0,
};

test("drops malformed and financially inconsistent saved runs", () => {
  const inconsistent = { ...validRun, id: "SF-BAD", netPnl: 10 };
  assert.deepEqual(
    readStoredRuns(storage(JSON.stringify([validRun, inconsistent, null]))),
    [validRun],
  );
  assert.deepEqual(readStoredRuns(storage("{broken json")), []);
});

test("writes only complete run snapshots", () => {
  const result = writeStoredRuns(storage(), [validRun, { id: "incomplete" }]);
  assert.deepEqual(result, [validRun]);
  assert.deepEqual(JSON.parse(storage.written), [validRun]);
});
