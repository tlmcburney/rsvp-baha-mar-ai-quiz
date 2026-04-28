import { supabase } from "./lib/supabase.mjs";
import { aggregate } from "./lib/aggregate.mjs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: rows, error } = await supabase
    .from("responses")
    .select("industry, answers");

  if (error) {
    console.error("Supabase query failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch results" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = aggregate(rows || []);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}

export const config = {
  path: "/api/results",
};
