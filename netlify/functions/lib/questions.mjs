/**
 * Single source of truth for all 20 quiz questions.
 * Imported by serverless functions. Frontend quiz.html has its own copy
 * (vanilla HTML can't import ES modules from serverless paths).
 *
 * Each question has:
 *   id    — "a1"-"a10" (Alain's) or "t1"-"t10" (Travis's)
 *   text  — the question shown to the user
 *   rec   — recommendation shown when the answer triggers it
 *   triggerOn — which answer triggers the recommendation ("no" for most, "yes" for t2)
 */

export const questions = [
  // ── Alain's questions ──────────────────────────────────
  {
    id: "a1",
    text: "Can you deliver your pitch in 10 seconds?",
    rec: "You need an elevator pitch. A 10-second version of what you do and who you serve is the foundation of every client conversation.",
    triggerOn: "no",
  },
  {
    id: "a2",
    text: "If a publication asked for a 100-word bio, do you have one ready?",
    rec: "You need a professional bio. Having one ready saves hours and ensures your story is told consistently.",
    triggerOn: "no",
  },
  {
    id: "a3",
    text: "Can you clearly define your ideal customer?",
    rec: "You need a customer avatar. Knowing exactly who your ideal client is makes every marketing and sales decision easier.",
    triggerOn: "no",
  },
  {
    id: "a4",
    text: "Can your business run 100% without you?",
    rec: "Your business needs documented systems. If it stops when you stop, it owns you instead of the other way around.",
    triggerOn: "no",
  },
  {
    id: "a5",
    text: "Is your business ready for AI?",
    rec: "Your business is leaving time and money on the table. AI tools are ready for you even if you are not ready for them yet.",
    triggerOn: "no",
  },
  {
    id: "a6",
    text: "Is your client journey clearly defined?",
    rec: "Your client journey needs mapping. Every touchpoint from inquiry to delivery should be intentional, not improvised.",
    triggerOn: "no",
  },
  {
    id: "a7",
    text: "Do you have a brand story?",
    rec: "You need a brand story. People book vendors they connect with, and your story is how that connection starts.",
    triggerOn: "no",
  },
  {
    id: "a8",
    text: "Do you have your Unique Value Proposition clearly defined?",
    rec: "You need a clear UVP. Without one, you are competing on price instead of value.",
    triggerOn: "no",
  },
  {
    id: "a9",
    text: "Do you have a Brand Guide document created for your company?",
    rec: "You need a Brand Guide. Without it, your brand looks different every time someone new touches it.",
    triggerOn: "no",
  },
  {
    id: "a10",
    text: "Is your social media and website optimized?",
    rec: "Your digital presence needs attention. Your website and social media are often the first impression a client gets.",
    triggerOn: "no",
  },

  // ── Travis's questions ─────────────────────────────────
  {
    id: "t1",
    text: "Do you spend more time on your business or in your business?",
    rec: "You are stuck in execution mode. AI can handle the repetitive work so you can focus on growth.",
    triggerOn: "no", // Yes = on your business (good), No = in your business (needs help)
  },
  {
    id: "t2",
    text: "Are you spending hours doing manual or repetitive tasks every single day, week, or event?",
    rec: "You are losing hours every week to tasks a system could handle. That time is recoverable.",
    triggerOn: "yes", // Yes means they ARE wasting time — inverted question
  },
  {
    id: "t3",
    text: "Do you have an automated follow-up workflow after a client inquiry?",
    rec: "Every unanswered inquiry is a potential booking lost. An automated follow-up sequence fixes this overnight.",
    triggerOn: "no",
  },
  {
    id: "t4",
    text: "Do you have a system that captures action items from client calls automatically?",
    rec: "Action items falling through the cracks costs you client trust. A simple AI pipeline captures everything automatically.",
    triggerOn: "no",
  },
  {
    id: "t5",
    text: "Do you track decisions and risks from every client conversation?",
    rec: "Decisions and risks undocumented are decisions and risks forgotten. One tool can change this immediately.",
    triggerOn: "no",
  },
  {
    id: "t6",
    text: "Do all of your systems talk to one another?",
    rec: "Disconnected systems mean manual data entry and dropped balls. Integration is closer and cheaper than you think.",
    triggerOn: "no",
  },
  {
    id: "t7",
    text: "Does every client go through the same experience with you, or does it depend on how busy you are?",
    rec: "Inconsistent client experiences hurt referrals. Systematizing your process makes excellence repeatable.",
    triggerOn: "no", // Yes = same experience (good), No = inconsistent
  },
  {
    id: "t8",
    text: "If you were out sick for a week, would your business keep moving without you?",
    rec: "Your business is fragile. One sick week reveals every process that only lives in your head.",
    triggerOn: "no",
  },
  {
    id: "t9",
    text: "When a team member or contractor leaves, does their knowledge stay with your business?",
    rec: "Every departure takes institutional knowledge with it. Capturing that knowledge is a one-time investment with permanent returns.",
    triggerOn: "no",
  },
  {
    id: "t10",
    text: "Do you have a plan to get 10 extra hours a week back?",
    rec: "Ten hours a week is recoverable. The tools exist right now. The question is whether you build the systems to use them.",
    triggerOn: "no",
  },
];

/** Map question id → question object for fast lookup */
export const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

/** Industry options (must match frontend dropdown) */
export const industries = [
  "Event Planner / Coordinator",
  "Photographer",
  "Videographer",
  "Rental / Production Company",
  "Floral / Design / Creative",
  "Hospitality / Hotel",
  "DJ / Entertainment",
  "Other",
];
