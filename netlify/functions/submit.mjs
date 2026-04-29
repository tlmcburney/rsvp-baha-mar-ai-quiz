import { supabase } from "./lib/supabase.mjs";
import { questionMap } from "./lib/questions.mjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, context) {
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

  const { name, email, phone, industry, answers } = body;

  // Validate required fields
  if (!name || !email || !industry || !answers) {
    const missing = [];
    if (!name) missing.push("name");
    if (!email) missing.push("email");
    if (!industry) missing.push("industry");
    if (!answers) missing.push("answers");
    return new Response(
      JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Insert into Supabase (critical path)
  const { error: dbError } = await supabase.from("responses").insert({
    name,
    email,
    phone: phone || null,
    industry,
    answers,
  });

  if (dbError) {
    console.error("Supabase insert failed:", dbError);
    return new Response(
      JSON.stringify({ error: "Failed to save response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Send email (fire-and-forget — don't block the response)
  sendEmail(name, email, answers).catch((err) => {
    console.error("Email send failed:", err);
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendEmail(name, email, answers) {
  const recommendations = [];

  for (const [qId, answer] of Object.entries(answers)) {
    const q = questionMap[qId];
    if (!q) continue;
    if (answer === q.triggerOn) {
      recommendations.push({ question: q.text, rec: q.rec });
    }
  }

  const hasRecs = recommendations.length > 0;

  const recsHtml = hasRecs
    ? recommendations
        .map(
          (r) => `
        <tr>
          <td style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 700; color: #0a1628; font-size: 15px;">${r.question}</p>
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${r.rec}</p>
          </td>
        </tr>`
        )
        .join("")
    : `
        <tr>
          <td style="padding: 24px; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #0a1628; font-weight: 600;">You answered every question with confidence.</p>
            <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">Your business foundations are solid. Keep building.</p>
          </td>
        </tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: #0a1628; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #d4a843; font-size: 22px; font-weight: 700;">RSVP Baha Mar</h1>
              <p style="margin: 8px 0 0; color: #8899aa; font-size: 14px;">Business Operations Workshop</p>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 24px 16px;">
              <p style="margin: 0; font-size: 16px; color: #0a1628;">Hi ${escapeHtml(name)},</p>
              <p style="margin: 12px 0 0; font-size: 14px; color: #374151; line-height: 1.6;">Thanks for completing the RSVP Baha Mar quiz! Here's your personalized action plan based on your responses.</p>
            </td>
          </tr>
          <!-- Recommendations -->
          <tr>
            <td style="padding: 8px 24px 8px;">
              <h2 style="margin: 0 0 4px; font-size: 16px; color: #d4a843; text-transform: uppercase; letter-spacing: 0.05em;">${hasRecs ? "Your Action Items" : "Results"}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
                ${recsHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">See you in the Bahamas.</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #0a1628; font-weight: 600;">Alain Martinez &amp; Travis McBurney</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // TODO: Replace from address with verified domain when available
  const { error } = await resend.emails.send(
    {
      from: "RSVP Baha Mar <noreply@themcburneygroup.com>",
      to: [email],
      subject: "Your AI Readiness Results — RSVP Baha Mar",
      html,
    },
    { idempotencyKey: `rsvp-results/${email}` }
  );

  if (error) {
    console.error("Resend error:", error.message);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const config = {
  path: "/api/submit",
};
