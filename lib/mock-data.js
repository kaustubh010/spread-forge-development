export const contracts = [
  {
    symbol: "GOLDM",
    name: "Gold Mini",
    lot: "100 g",
    quote: "₹ / 10 g",
    purity: "995",
    expiry: "3rd–5th",
    margin: "₹68,420",
    liquidity: "A−",
    price: 7228.4,
    spread: 0.42,
    change: 0.31,
    status: "Demo • 14:32 IST",
  },
  {
    symbol: "GOLDTEN",
    name: "Gold Ten",
    lot: "10 g",
    quote: "₹ / 10 g",
    purity: "999",
    expiry: "27th–31st",
    margin: "₹6,980",
    liquidity: "B+",
    price: 7251.8,
    spread: -0.18,
    change: -0.27,
    status: "Demo • 14:32 IST",
  },
  {
    symbol: "GOLDGUINEA",
    name: "Gold Guinea",
    lot: "8 g",
    quote: "₹ / 8 g",
    purity: "999",
    expiry: "27th–31st",
    margin: "₹5,540",
    liquidity: "B",
    price: 5798.6,
    spread: 0.13,
    change: 0.08,
    status: "Demo • 14:32 IST",
  },
  {
    symbol: "GOLDPETAL",
    name: "Gold Petal",
    lot: "1 g",
    quote: "₹ / 1 g",
    purity: "999",
    expiry: "27th–31st",
    margin: "₹710",
    liquidity: "C+",
    price: 726.1,
    spread: -0.36,
    change: -0.12,
    status: "Demo • 14:32 IST",
  },
];

export const runs = [
  {
    id: "SF-2409-AX7",
    name: "September reversion scan",
    pair: "GOLDM / GOLDTEN",
    period: "01 Aug — 30 Sep 2024",
    pnl: 18420,
    trades: 18,
    verdict: "Inconclusive",
    created: "Today, 14:05",
  },
  {
    id: "SF-2408-QM2",
    name: "Expiry window stress",
    pair: "GOLDTEN / GOLDPETAL",
    period: "01 Jul — 31 Aug 2024",
    pnl: -3240,
    trades: 27,
    verdict: "No Robust Edge",
    created: "Yesterday, 18:42",
  },
  {
    id: "SF-2407-KL9",
    name: "Low-cost baseline",
    pair: "GOLDGUINEA / GOLDPETAL",
    period: "01 Jun — 30 Jun 2024",
    pnl: 7620,
    trades: 11,
    verdict: "Potential Edge",
    created: "12 Oct, 10:18",
  },
];

export const spreadSeries = Array.from({ length: 40 }, (_, index) => {
  const date = new Date(2024, 7, 1 + index);
  const spread =
    0.12 +
    Math.sin(index / 3.4) * 0.31 +
    Math.cos(index / 6.2) * 0.12 +
    (index % 9 === 0 ? -0.08 : 0);
  return {
    date: date.toISOString().slice(0, 10),
    spread: Number(spread.toFixed(3)),
    goldm: Number((7220 + Math.sin(index / 2.7) * 22 + index * 0.7).toFixed(2)),
    goldten: Number(
      (7241 + Math.cos(index / 3.4) * 16 + index * 0.55).toFixed(2),
    ),
  };
});

export const observations = spreadSeries
  .slice(-12)
  .map((point, index) => ({
    ...point,
    volume: [1824, 1411, 2098, 987, 1660, 2274][index % 6],
    gap: index === 5 || index === 10,
  }));

export const backtestStats = {
  winRate: 61.1,
  maxDrawdown: -8420,
  sharpe: 1.18,
  grossPnl: 23640,
  costs: 5220,
  netPnl: 18420,
};

export const evidenceChecks = [
  {
    label: "Out-of-sample window",
    value: "Pass",
    detail: "12 observations held out",
    tone: "positive",
  },
  {
    label: "Double-cost sensitivity",
    value: "Watch",
    detail: "Edge compresses to ₹7,980",
    tone: "warning",
  },
  {
    label: "Expiry concentration",
    value: "Review",
    detail: "6 of 18 trades near expiry",
    tone: "negative",
  },
  {
    label: "Minimum sample size",
    value: "Pass",
    detail: "18 completed trades",
    tone: "positive",
  },
];

export const tradeHistory = [
  {
    id: "T-001",
    date: "2024-08-06",
    side: "Long GOLDM / Short GOLDTEN",
    entry: 0.486,
    exit: 0.102,
    gross: 3840,
    costs: 420,
    net: 3420,
    status: "Closed",
  },
  {
    id: "T-002",
    date: "2024-08-14",
    side: "Short GOLDM / Long GOLDTEN",
    entry: -0.391,
    exit: -0.074,
    gross: 3170,
    costs: 420,
    net: 2750,
    status: "Closed",
  },
  {
    id: "T-003",
    date: "2024-08-22",
    side: "Long GOLDM / Short GOLDTEN",
    entry: 0.522,
    exit: 0.128,
    gross: 3940,
    costs: 420,
    net: 3520,
    status: "Closed",
  },
  {
    id: "T-004",
    date: "2024-09-03",
    side: "Short GOLDM / Long GOLDTEN",
    entry: -0.448,
    exit: -0.016,
    gross: 4320,
    costs: 420,
    net: 3900,
    status: "Closed",
  },
  {
    id: "T-005",
    date: "2024-09-18",
    side: "Long GOLDM / Short GOLDTEN",
    entry: 0.412,
    exit: 0.176,
    gross: 2360,
    costs: 420,
    net: 1940,
    status: "Closed",
  },
  {
    id: "T-006",
    date: "2024-09-27",
    side: "Short GOLDM / Long GOLDTEN",
    entry: -0.336,
    exit: -0.041,
    gross: 6010,
    costs: 420,
    net: 5590,
    status: "Closed",
  },
];

export const validationResults = [
  {
    label: "Gross P&L",
    value: backtestStats.grossPnl,
    detail: "Before transaction costs",
  },
  {
    label: "Trading costs",
    value: backtestStats.costs,
    detail: "18 round trips × ₹290 blended",
  },
  {
    label: "Net P&L",
    value: backtestStats.grossPnl - backtestStats.costs,
    detail: "Canonical result after costs",
  },
];
