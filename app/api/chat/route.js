import { NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function fetchGroqChat(apiKey, model, messages) {
  return fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "SpreadForge/1.0",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 750,
      stream: true,
    }),
  });
}

export async function POST(request) {
  try {
    const { messages, caseData } = await request.json();

    // Refuse if caseData is missing
    if (!caseData || !caseData.drop_date) {
      return NextResponse.json(
        { error: "Run a case first." },
        { status: 400 }
      );
    }

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

    // Build context strictly from actual caseData without hallucinated fallbacks
    const dropDate = caseData.drop_date || "Not isolated";
    const netChange = caseData.total_change != null ? `${caseData.total_change} ${caseData.unit || "bps"}` : "N/A";
    const beforeAvg = caseData.before_avg != null ? `${caseData.before_avg} ${caseData.unit || "bps"}` : "N/A";
    const afterAvg = caseData.after_avg != null ? `${caseData.after_avg} ${caseData.unit || "bps"}` : "N/A";
    const topSuspect = caseData.causes?.[0]
      ? `${caseData.causes[0].segment} (${caseData.causes[0].share_pct}% share, shift ${caseData.causes[0].change} ${caseData.unit || "bps"})`
      : "None";
    const secondarySuspect = caseData.causes?.[1]
      ? `${caseData.causes[1].segment} (${caseData.causes[1].share_pct}% share, shift ${caseData.causes[1].change} ${caseData.unit || "bps"})`
      : null;
    const verdict = caseData.validation?.verdict || "AUDITED";
    const status = caseData.validation?.status || "AUDITED";
    const netPnl = caseData.validation?.net_pnl != null ? `₹${caseData.validation.net_pnl.toLocaleString("en-IN")}` : "N/A";
    const grossPnl = caseData.validation?.gross_pnl != null ? `₹${caseData.validation.gross_pnl.toLocaleString("en-IN")}` : "N/A";
    const costs = caseData.validation?.transaction_costs != null ? `₹${caseData.validation.transaction_costs.toLocaleString("en-IN")}` : "N/A";
    const pVal = caseData.validation?.p_value != null ? `p = ${caseData.validation.p_value}` : "N/A";
    const tradesCount = caseData.validation?.trades_count != null ? caseData.validation.trades_count : "N/A";
    const dataQuality = caseData.data_quality || "Exchange bhavcopy dataset";

    const systemPrompt = `You are "Explain with AI" — an objective, pedagogical quantitative commodities guide embedded in SpreadForge.
Your role is to explain the verdict given in the case data objectively. Do not argue for or against it. Rely strictly on the numbers present in the CURRENT CASE FILE CONTEXT below. Do not invent or assume data that is not provided.

CRITICAL CURRENCY INSTRUCTION:
- Always use Indian Rupees (₹ / INR) for all currency figures, costs, prices, and PnL. NEVER use US dollars ($) or any other foreign currency.

CURRENT CASE FILE CONTEXT:
- Exchange Market: Multi Commodity Exchange of India (MCX)
- Data Quality / History: ${dataQuality}
- Scene / Drop Date: ${dropDate}
- Headline Spread Shift: ${netChange} (7-day before avg: ${beforeAvg} → 7-day after avg: ${afterAvg})
- Factor Attribution:
  * Primary leg: ${topSuspect}
  ${secondarySuspect ? `* Secondary leg: ${secondarySuspect}` : ""}
- Official Verdict: ${verdict} (Status: ${status})
- Strategy Metrics:
  * Gross Theoretical PnL: ${grossPnl}
  * Exchange Costs & Friction: ${costs}
  * Realized Net PnL: ${netPnl}
  * Monte Carlo Shuffle Significance: ${pVal}
  * Realized Trades Count: ${tradesCount}

CORE OBJECTIVE EXPLANATION GUIDELINES:
1. Explain the verdict given in the case data objectively. Do not argue for or against it.
2. If net PnL is negative or p-value is high (e.g. p = 0.22, failing p < 0.05), explain what those specific statistical metrics mean in plain terms (e.g. high likelihood of noise, trading friction exceeding gross movement).
3. If the case data shows that purity parity is normalized (995 vs 999), explain how mathematical normalization (× 999/995) ensures true comparison rather than unhedged purity bias.
4. Format your response cleanly using bold markdown headers, concise bullet points, and highlight metrics with bold text.
5. Conclude with a brief, objective summary paragraph.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    // Try primary model qwen/qwen3.8-27b, fall back to llama-3.3-70b-versatile if unavailable
    let groqResponse = await fetchGroqChat(apiKey, "qwen/qwen3.8-27b", fullMessages);

    if (!groqResponse.ok && groqResponse.status === 404) {
      console.warn("Groq qwen/qwen3.8-27b returned 404, falling back to llama-3.3-70b-versatile");
      groqResponse = await fetchGroqChat(apiKey, "llama-3.3-70b-versatile", fullMessages);
    }

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
