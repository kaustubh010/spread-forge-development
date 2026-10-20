import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const summaryPath = path.join(process.cwd(), "data", "live_summary.json");
  const bhavcopyPath = path.join(process.cwd(), "data", "bhavcopy_gold.json");

  try {
    // Check if live_summary.json exists
    try {
      const data = await fs.readFile(summaryPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    } catch {
      // Fallback: extract summary from bhavcopy_gold.json
      const raw = await fs.readFile(bhavcopyPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.summary) {
        return NextResponse.json(parsed.summary);
      }
    }
  } catch (err) {
    console.error("Error reading live summary:", err);
  }

  return null
}
