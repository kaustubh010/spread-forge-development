import test from "node:test";
import assert from "node:assert/strict";
import {
  alignHistoricalSeries,
  normalizeHistoricalResponse,
  toSimulationObservations,
  fetchHistoricalSeries,
} from "./market-data.js";

test("normalizes, sorts, and excludes malformed and duplicate records", () => {
  const result = normalizeHistoricalResponse(
    {
      observations: [
        { tradingDate: "2024-01-02", close: 10 },
        { tradingDate: "2024-01-01", close: 9 },
        { tradingDate: "2024-01-01", close: 8 },
        { tradingDate: "bad", close: 2 },
      ],
    },
    "GOLDM",
  );
  assert.deepEqual(
    result.observations.map((item) => item.date),
    ["2024-01-01", "2024-01-02"],
  );
  assert.equal(result.excluded.length, 2);
});
test("aligns comparable dates and exposes missing dates", () => {
  const result = alignHistoricalSeries(
    {
      contract: "GOLDM",
      observations: [
        { date: "2024-01-01", close: 10 },
        { date: "2024-01-02", close: 11 },
      ],
      excluded: [],
    },
    {
      contract: "GOLDTEN",
      observations: [
        { date: "2024-01-01", close: 20 },
        { date: "2024-01-02", close: 21 },
      ],
      excluded: [],
    },
  );
  assert.equal(result.matched.length, 2);
  assert.deepEqual(result.missing, []);
});
test("adapts aligned prices using explicit A-minus-B percentage spread", () => {
  const [point] = toSimulationObservations({
    matched: [
      { date: "2024-01-01", closeA: 110, closeB: 100, volumeA: 2, volumeB: 3 },
    ],
  });
  assert.equal(point.spread, 10);
  assert.equal(point.volume, 5);
});
test("does not fall back when the provider fails", async () => {
  await assert.rejects(
    () =>
      fetchHistoricalSeries({
        contract: "GOLDM",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
        fetchImpl: async () => ({ ok: false, status: 503 }),
      }),
    /provider returned 503/,
  );
});
