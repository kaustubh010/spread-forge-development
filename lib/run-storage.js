const isFiniteNumber = (value) => Number.isFinite(Number(value));

/**
 * Keep only complete simulation snapshots. This prevents stale or malformed
 * localStorage entries from becoming an apparently valid active run.
 */
export function isStoredRun(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.calculationKey === "string" &&
    value.parameters &&
    typeof value.parameters === "object" &&
    Array.isArray(value.observations) &&
    Array.isArray(value.trades) &&
    Array.isArray(value.equity) &&
    isFiniteNumber(value.grossPnl) &&
    isFiniteNumber(value.totalCosts) &&
    isFiniteNumber(value.netPnl) &&
    value.netPnl === value.grossPnl - value.totalCosts &&
    value.equity.length > 0 &&
    isFiniteNumber(value.equity.at(-1)?.value) &&
    value.equity.at(-1).value === value.netPnl,
  );
}

export function readStoredRuns(storage, key = "spreadforge-runs") {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredRun) : [];
  } catch {
    return [];
  }
}

export function writeStoredRuns(storage, runs, key = "spreadforge-runs") {
  const validRuns = Array.isArray(runs) ? runs.filter(isStoredRun) : [];
  storage?.setItem(key, JSON.stringify(validRuns));
  return validRuns;
}
