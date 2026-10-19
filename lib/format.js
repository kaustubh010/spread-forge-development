export const money = (value) =>
  `${value < 0 ? "−" : ""}₹${Math.abs(Number(value || 0)).toLocaleString("en-IN")}`;

export const percent = (value, decimals = 2) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const num = Number(value);
  return `${num > 0 ? "+" : ""}${num.toFixed(decimals)}%`;
};

export const formatNumber = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("en-IN");
};
