import { NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request) {
  try {
    const { messages, caseData } = await request.json();

    const apiKey =
      process.env.GROQ_API_KEY ||
      process.env.groq ||
      process.env.GROQ_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key not configured in environment." },
        { status: 500 }
      );
    }

    const systemPrompt = `You are "Explain with AI" — an intuitive, pedagogical quantitative commodities guide embedded in SpreadForge.
Your goal is to explain complex quantitative concepts, factor decompositions, and backtest results using crystal-clear analogies, rich formatting, and zero unnecessary jargon.

CURRENT CASE FILE CONTEXT:
- Case Status: ${caseData?.drop_found ? "Sustained Drop Isolated" : "No Drop Detected"}
- Drop Date / Scene: ${caseData?.drop_date || "2026-09-24"}
- Net Spread Shift: ${caseData?.total_change != null ? caseData.total_change + " bps" : "104.5 bps"}
- Prime Suspect Leg: ${caseData?.causes?.[0]?.segment || "GOLDM Mini Delivery Divergence"} (${caseData?.causes?.[0]?.share_pct || 57.3}% share of downward divergence)
- Official Verdict: ${caseData?.validation?.verdict || "NO EDGE AFTER COSTS"}
- Realized Net PnL: ${caseData?.validation?.net_pnl != null ? "₹" + caseData.validation.net_pnl.toLocaleString("en-IN") : "-₹2,866"}
- Shuffle Significance: ${caseData?.validation?.p_value != null ? "p = " + caseData.validation.p_value : "p = 0.22 (fails significance test p < 0.05)"}
- Exchange Fees + Slippage Hurdle: ₹4,200 round trip

STYLE & FORMATTING RULES:
1. Use real-world intuitive analogies (like "finding a $10 bill on the ground, but paying a $15 entrance fee to reach it").
2. Format answers with bold bullet points, clear numbered sections, and bold emphasis on key numbers.
3. Emphasize why the trader lost money or why there is NO EDGE after fees:
   - The fee (₹4,200) was larger than the prize (104.5 bps move).
   - The statistical shuffle test yielded p = 0.22 (a 22% chance of pure random coincidence/noise, like betting on a coin flip).
   - Retail contract friction (GOLDGUINEA/GOLDPETAL) creates wide bid-ask spreads that make paper gaps uncapturable.
   - Purity differences (995 vs 999) require an exact (x 999/995) mathematical adjustment; otherwise you're trading a purity difference rather than a mispricing.
4. Conclude with a crisp, punchy "Summary" section.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "SpreadForge/1.0",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: fullMessages,
        temperature: 0.35,
        max_tokens: 750,
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      return NextResponse.json(
        { error: `Groq AI provider error (${groqResponse.status})` },
        { status: groqResponse.status }
      );
    }

    return new Response(groqResponse.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI response: " + err.message },
      { status: 500 }
    );
  }
}
