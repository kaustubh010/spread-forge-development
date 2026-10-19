import { NextResponse } from "next/server";
import { validateHistoricalRequest } from "../../../../lib/market-data.js";

export async function GET(request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  try {
    validateHistoricalRequest(params);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    {
      error:
        "No historical market-data provider is configured for this project. Configure a server-side provider before requesting live historical observations.",
    },
    { status: 503 },
  );
}
