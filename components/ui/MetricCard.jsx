export function MetricCard({ label, value, detail, tone = "" }) {
  return (
    <div className="metric">
      <div className="eyebrow">{label}</div>
      <div className={`metric-value ${tone}`}>{value}</div>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}

// Alias for backwards compatibility
export const Metric = MetricCard;
