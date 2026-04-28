import { supabase } from "./lib/supabase.mjs";
import { aggregate } from "./lib/aggregate.mjs";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: rows, error: dbError } = await supabase
    .from("responses")
    .select("industry, answers");

  if (dbError) {
    console.error("Supabase query failed:", dbError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({ insights: ["No responses yet. Insights will appear once attendees start completing the quiz."] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = aggregate(rows);

  const prompt = `You are analyzing live quiz results from a business operations workshop for event industry professionals (planners, photographers, videographers, DJs, etc.) at a conference called RSVP Baha Mar.

Here is the aggregated data from ${data.total} responses:

OVERALL RESULTS (per question):
${data.questions.map((q) => `- ${q.id}: "${q.text}" → ${q.yesPct}% Yes, ${q.noPct}% No`).join("\n")}

INDUSTRY BREAKDOWN:
${data.industries
  .map(
    (ind) =>
      `${ind.name} (${ind.count} responses):\n${data.questions
        .map((q) => {
          const iq = ind.questions[q.id];
          const total = iq.yes + iq.no;
          if (total === 0) return null;
          return `  ${q.id}: ${Math.round((iq.yes / total) * 100)}% Yes, ${Math.round((iq.no / total) * 100)}% No`;
        })
        .filter(Boolean)
        .join("\n")}`
  )
  .join("\n\n")}

Generate exactly 3-5 narrative observations about patterns in this data. Focus on:
- Which areas the group is strongest and weakest in
- Notable differences between vendor types/industries
- Actionable takeaways the presenters can mention live

Each observation should be 1-2 sentences. Be specific — reference actual percentages and industries. Write in a direct, professional tone suitable for reading aloud at a conference. Do not use bullet points or numbering — return each observation as a separate line.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.text || "";
    const insights = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return new Response(
      JSON.stringify({ error: "Insights temporarily unavailable" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const config = {
  path: "/api/insights",
};
