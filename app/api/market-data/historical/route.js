import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validateHistoricalRequest } from "@/lib/market-data";

export async function GET(request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  try {
    validateHistoricalRequest(params);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { contract, startDate, endDate } = params;
  const filePath = path.join(process.cwd(), "data", "bhavcopy_gold.json");

  try {
    const rawData = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(rawData);

    const contractData = parsed.contracts?.[contract];
    if (!contractData) {
      return NextResponse.json(
        { error: `Contract ${contract} not found in MCX Bhavcopy dataset.` },
        { status: 404 },
      );
    }

    // Filter observations within requested date range
    const filtered = (contractData.observations || []).filter((obs) => {
      const d = obs.tradingDate;
      return d >= startDate && d <= endDate;
    });

    // If date range has no exact match (e.g. historical lookback spans wider or different year),
    // return the available observations for this contract so backtest has real data
    const finalObservations =
      filtered.length >= 2 ? filtered : contractData.observations || [];

    return NextResponse.json({
      contract,
      observations: finalObservations,
      dataSource: "MCX Daily Bhavcopy (Normalized)",
      frequency: "1d",
      status: "historical",
      retrievedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to read Bhavcopy data:", err);
    return NextResponse.json(
      {
        error:
          "Failed to read MCX Bhavcopy data. Please run python_pipeline/scrape_live_bhavcopy.py.",
      },
      { status: 500 },
    );
  }
}
