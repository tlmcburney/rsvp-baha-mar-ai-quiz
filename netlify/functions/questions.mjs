import { supabase } from "./lib/supabase.mjs";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, ai_questions, group_questions } = body;

  if (!email) {
    return new Response(
      JSON.stringify({ error: "Missing required field: email" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Find the existing response row
  const { data: existing, error: fetchError } = await supabase
    .from("responses")
    .select("id, ai_questions, group_questions")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !existing) {
    console.error("Could not find response for email:", email, fetchError);
    return new Response(
      JSON.stringify({ error: "No response found for this email" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Append new questions to existing arrays
  const updatedAi = [
    ...(existing.ai_questions || []),
    ...(ai_questions || []),
  ];
  const updatedGroup = [
    ...(existing.group_questions || []),
    ...(group_questions || []),
  ];

  const { error: updateError } = await supabase
    .from("responses")
    .update({
      ai_questions: updatedAi,
      group_questions: updatedGroup,
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Failed to update questions:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to save questions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = {
  path: "/api/questions",
};
