const CONTRACTS = new Set(["GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"]);
const PERIODS = new Set([30, 90, 180, 365]);

export function validateHistoricalRequest({ contract, startDate, endDate }) {
  if (!CONTRACTS.has(contract))
    throw new Error("Unsupported contract identifier.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  )
    throw new Error("Dates must use YYYY-MM-DD format.");
  if (startDate > endDate)
    throw new Error("Start date must be before end date.");
  return { contract, startDate, endDate };
}

export function normalizeHistoricalResponse(payload, expectedContract) {
  const records = Array.isArray(payload?.observations)
    ? payload.observations
    : [];
  const seen = new Set();
  const excluded = [];
  const observations = records
    .flatMap((record, index) => {
      const date = String(record?.tradingDate || record?.timestamp || "").slice(
        0,
        10,
      );
      const close = Number(record?.close);
      if (record?.contract && record.contract !== expectedContract) {
        excluded.push({ index, reason: "contract-mismatch" });
        return [];
      }
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(close) ||
        close <= 0
      ) {
        excluded.push({ index, reason: "malformed-record" });
        return [];
      }
      if (seen.has(date)) {
        excluded.push({ index, reason: "duplicate-trading-date" });
        return [];
      }
      seen.add(date);
      return [
        {
          contract: expectedContract,
          date,
          timestamp: record.timestamp || date,
          open: Number.isFinite(Number(record.open))
            ? Number(record.open)
            : null,
          high: Number.isFinite(Number(record.high))
            ? Number(record.high)
            : null,
          low: Number.isFinite(Number(record.low)) ? Number(record.low) : null,
          close,
          volume: Number.isFinite(Number(record.volume))
            ? Number(record.volume)
            : null,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    contract: expectedContract,
    observations,
    excluded,
    metadata: {
      dataSource: payload?.dataSource || "Historical market data",
      retrievedAt: payload?.retrievedAt || null,
      frequency: payload?.frequency || "1d",
      status: payload?.status || "historical",
    },
  };
}

export function alignHistoricalSeries(seriesA, seriesB) {
  if (
    !seriesA?.contract ||
    !seriesB?.contract ||
    seriesA.contract === seriesB.contract
  )
    throw new Error("Two different contracts are required for alignment.");
  const byDateB = new Map(
    seriesB.observations.map((item) => [item.date, item]),
  );
  const matched = [];
  const missing = [];
  seriesA.observations.forEach((a) => {
    const b = byDateB.get(a.date);
    if (!b) missing.push(a.date);
    else
      matched.push({
        date: a.date,
        contractA: a.contract,
        contractB: b.contract,
        closeA: a.close,
        closeB: b.close,
        volumeA: a.volume,
        volumeB: b.volume,
      });
  });
  if (matched.length < 2)
    throw new Error("At least two comparable trading dates are required.");
  return {
    matched,
    missing,
    excludedCount: seriesA.excluded.length + seriesB.excluded.length,
  };
}

export function toSimulationObservations(aligned) {
  return aligned.matched.map((row) => {
    // Normalization is explicit: percentage price difference, A minus B, consistent with simulateRun.
    if (
      !Number.isFinite(row.closeA) ||
      !Number.isFinite(row.closeB) ||
      row.closeA <= 0 ||
      row.closeB <= 0
    )
      throw new Error("Cannot normalize non-positive contract prices.");
    return {
      date: row.date,
      spread: Number(
        (((row.closeA - row.closeB) / row.closeB) * 100).toFixed(6),
      ),
      volume: [row.volumeA, row.volumeB]
        .filter((value) => Number.isFinite(value))
        .reduce((sum, value) => sum + value, 0),
      source: "Historical market data",
      contractA: row.contractA,
      contractB: row.contractB,
    };
  });
}

export async function fetchHistoricalSeries({
  contract,
  startDate,
  endDate,
  fetchImpl = fetch,
  signal,
}) {
  validateHistoricalRequest({ contract, startDate, endDate });
  const params = new URLSearchParams({ contract, startDate, endDate });
  const response = await fetchImpl(`/api/market-data/historical?${params}`, {
    signal,
  });
  if (!response.ok)
    throw new Error(
      `Historical data provider returned ${response.status}. Configure the backend provider before running a real-data backtest.`,
    );
  return normalizeHistoricalResponse(await response.json(), contract);
}

export { CONTRACTS, PERIODS };
