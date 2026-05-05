import { supabase } from "./lib/supabase.mjs";
import { questions, questionMap } from "./lib/questions.mjs";
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

  // Send email — await so we can surface errors for debugging
  const emailResult = await sendEmail(name, email, answers);

  return new Response(JSON.stringify({ ok: true, email: emailResult }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendEmail(name, email, answers) {
  // Build all 20 question rows — show every question with result
  const questionRows = questions
    .map((q) => {
      const answer = answers[q.id];
      const triggered = answer === q.triggerOn;

      if (triggered) {
        // No answer — show recommendation
        return `
        <tr>
          <td style="padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" valign="top" style="padding-top: 2px;">
                  <span style="color: #ef4444; font-size: 18px; font-weight: 700;">&#10007;</span>
                </td>
                <td>
                  <p style="margin: 0 0 6px; font-weight: 700; color: #0a1628; font-size: 14px;">${q.text}</p>
                  <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.5;">${q.rec}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      } else {
        // Yes answer — congratulations
        return `
        <tr>
          <td style="padding: 12px 24px; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" valign="top" style="padding-top: 2px;">
                  <span style="color: #4caf50; font-size: 18px; font-weight: 700;">&#10003;</span>
                </td>
                <td>
                  <p style="margin: 0; font-weight: 600; color: #0a1628; font-size: 14px;">${q.text}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      }
    })
    .join("");

  const hasNos = questions.some((q) => answers[q.id] === q.triggerOn);

  const ctaSection = hasNos
    ? `
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">For any questions you answered with No, solutions exist for you. If you are interested in connecting with Alain or Travis to discuss, reach out directly:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="mailto:alain@alainmartinez.com?subject=RSVP%20Baha%20Mar%20Follow-Up" style="display: inline-block; padding: 12px 24px; background: #0a1628; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px;">Contact Alain</a>
                  </td>
                  <td>
                    <a href="mailto:travis@themcburneygroup.com?subject=RSVP%20Baha%20Mar%20Follow-Up" style="display: inline-block; padding: 12px 24px; background: #d4a843; color: #0a1628; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px;">Contact Travis</a>
                  </td>
                </tr>
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
              <p style="margin: 12px 0 0; font-size: 14px; color: #374151; line-height: 1.6;">Thanks for completing the RSVP Baha Mar quiz! Here are your results for all 20 questions.</p>
            </td>
          </tr>
          <!-- All 20 Questions -->
          <tr>
            <td style="padding: 8px 24px 8px;">
              <h2 style="margin: 0 0 4px; font-size: 16px; color: #d4a843; text-transform: uppercase; letter-spacing: 0.05em;">Your Results</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
                ${questionRows}
              </table>
            </td>
          </tr>
          <!-- CTA Section -->
          ${ctaSection}
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
      subject: "Your AI Readiness Results — RSVP Baha Mar",
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
  path: "/api/submit",
};
