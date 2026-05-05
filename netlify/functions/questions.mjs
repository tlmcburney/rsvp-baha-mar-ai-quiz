import { supabase } from "./lib/supabase.mjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    .select("id, name, ai_questions, group_questions")
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

  // Send confirmation email with their questions
  const allAi = updatedAi;
  const allGroup = updatedGroup;

  if (allAi.length > 0 || allGroup.length > 0) {
    const emailResult = await sendQuestionsEmail(
      existing.name || "there",
      email,
      allAi,
      allGroup
    );
    return new Response(JSON.stringify({ ok: true, email: emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendQuestionsEmail(name, email, aiQuestions, groupQuestions) {
  const aiSection =
    aiQuestions.length > 0
      ? `
          <tr>
            <td style="padding: 8px 24px 8px;">
              <h2 style="margin: 0 0 4px; font-size: 16px; color: #d4a843; text-transform: uppercase; letter-spacing: 0.05em;">Your AI Questions</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
                ${aiQuestions
                  .map(
                    (q) => `
                <tr>
                  <td style="padding: 12px 24px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #0a1628; font-size: 14px; line-height: 1.5;">${escapeHtml(q)}</p>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>
            </td>
          </tr>`
      : "";

  const groupSection =
    groupQuestions.length > 0
      ? `
          <tr>
            <td style="padding: 16px 24px 8px;">
              <h2 style="margin: 0 0 4px; font-size: 16px; color: #d4a843; text-transform: uppercase; letter-spacing: 0.05em;">Your Group Questions</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
                ${groupQuestions
                  .map(
                    (q) => `
                <tr>
                  <td style="padding: 12px 24px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #0a1628; font-size: 14px; line-height: 1.5;">${escapeHtml(q)}</p>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>
            </td>
          </tr>`
      : "";

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
              <p style="margin: 12px 0 0; font-size: 14px; color: #374151; line-height: 1.6;">We received your questions. Alain and/or Travis will follow up with you via email to answer them.</p>
            </td>
          </tr>
          ${aiSection}
          ${groupSection}
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #0a1628; font-weight: 600;">Alain Martinez &amp; Travis McBurney</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: "RSVP Baha Mar <noreply@themcburneygroup.com>",
      to: [email],
      subject: "Your Questions — RSVP Baha Mar",
      html,
    });

    if (error) {
      console.error("Resend error:", JSON.stringify(error));
      return { error: error };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("Email exception:", err.message);
    return { error: err.message };
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
  path: "/api/questions",
};
