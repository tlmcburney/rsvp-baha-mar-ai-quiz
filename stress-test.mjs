/**
 * RSVP Quiz App — Stress Test
 *
 * Simulates 100 concurrent users registering and answering the quiz.
 * Uses .invalid emails so Resend won't deliver anything.
 *
 * Usage:
 *   node stress-test.mjs https://rsvp-baha-mar-ai.netlify.app
 *   node stress-test.mjs http://localhost:8888
 *
 * After running, clean up test data in Supabase SQL Editor:
 *   DELETE FROM responses WHERE email LIKE '%@stresstest.invalid';
 */

const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error("Usage: node stress-test.mjs <BASE_URL>");
  console.error("  e.g. node stress-test.mjs https://rsvp-baha-mar-ai.netlify.app");
  process.exit(1);
}

// ── Configuration ──────────────────────────────
const TOTAL_USERS = 100;
const WAVE_SIZE = 10;         // Users per wave
const WAVE_DELAY_MS = 500;    // Delay between waves
const QUESTION_IDS = [
  "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10",
  "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10",
];

// Industry distribution matching ~100-150 conference attendees
const INDUSTRY_DISTRIBUTION = [
  { industry: "Event Planner / Coordinator", count: 30 },
  { industry: "Photographer", count: 18 },
  { industry: "Videographer", count: 12 },
  { industry: "Floral / Design / Creative", count: 12 },
  { industry: "Rental / Production Company", count: 10 },
  { industry: "Hospitality / Hotel", count: 8 },
  { industry: "DJ / Entertainment", count: 5 },
  { industry: "Not Listed", count: 5 },
];

// First/last name pools for realistic synthetic data
const FIRST_NAMES = [
  "Maria", "James", "Sarah", "David", "Jennifer", "Michael", "Lisa", "Robert",
  "Jessica", "William", "Ashley", "Carlos", "Amanda", "Antonio", "Stephanie",
  "Chris", "Nicole", "Kevin", "Rachel", "Marcus", "Tina", "Derek", "Lauren",
  "Andre", "Megan", "Victor", "Crystal", "Omar", "Brittany", "Terrence",
  "Natasha", "Brandon", "Jasmine", "Tyler", "Alexis", "Jordan", "Samantha",
  "Brian", "Michelle", "Darnell", "Tiffany", "Gregory", "Veronica", "Wayne",
  "Gabrielle", "Patrick", "Diana", "Russell", "Carmen", "Elliott",
];
const LAST_NAMES = [
  "Johnson", "Williams", "Brown", "Davis", "Garcia", "Martinez", "Robinson",
  "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "King",
  "Wright", "Scott", "Green", "Adams", "Nelson", "Hill", "Moore", "Jackson",
  "White", "Harris", "Thompson", "Martin", "Anderson", "Taylor", "Thomas",
  "Wilson", "Campbell", "Parker", "Edwards", "Collins", "Stewart", "Morris",
  "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera",
  "Cooper", "Richardson", "Cox", "Howard", "Ward",
];

// ── Generate Users ──────────────────────────────

function generateUsers() {
  const users = [];
  let userIndex = 0;

  for (const { industry, count } of INDUSTRY_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      userIndex++;
      const first = FIRST_NAMES[userIndex % FIRST_NAMES.length];
      const last = LAST_NAMES[Math.floor(userIndex / FIRST_NAMES.length) % LAST_NAMES.length];
      const paddedId = String(userIndex).padStart(3, "0");

      users.push({
        name: `${first} ${last}`,
        email: `test${paddedId}@stresstest.invalid`,
        phone: `(555) ${String(100 + userIndex).slice(-3)}-${String(1000 + userIndex).slice(-4)}`,
        industry,
        answers: generateAnswers(industry),
      });
    }
  }

  // Shuffle to simulate realistic registration order
  for (let i = users.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [users[i], users[j]] = [users[j], users[i]];
  }

  return users;
}

function generateAnswers(industry) {
  const answers = {};

  for (const id of QUESTION_IDS) {
    // Create industry-biased answer patterns for realistic data
    // Event planners: stronger on branding (a-questions), weaker on automation (t-questions)
    // Photo/video: mixed on branding, weak on systems
    // Others: generally weaker across the board
    let yesProb;

    if (id.startsWith("a")) {
      // Alain's branding questions
      if (industry === "Event Planner / Coordinator") yesProb = 0.65;
      else if (industry === "Photographer" || industry === "Videographer") yesProb = 0.50;
      else if (industry === "Floral / Design / Creative") yesProb = 0.55;
      else yesProb = 0.40;
    } else {
      // Travis's automation questions
      if (industry === "Event Planner / Coordinator") yesProb = 0.35;
      else if (industry === "Photographer" || industry === "Videographer") yesProb = 0.25;
      else if (industry === "Rental / Production Company") yesProb = 0.45;
      else yesProb = 0.30;
    }

    // Special case: t2 is inverted ("Are you spending hours on manual tasks?")
    // Higher yes = worse, so flip the probability
    if (id === "t2") yesProb = 1 - yesProb;

    answers[id] = Math.random() < yesProb ? "yes" : "no";
  }

  return answers;
}

// ── Submit a single user ────────────────────────

async function submitUser(user, index) {
  const start = performance.now();

  try {
    const res = await fetch(`${BASE_URL}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    const elapsed = Math.round(performance.now() - start);
    const body = await res.json();

    return {
      index,
      status: res.status,
      ok: res.ok,
      elapsed,
      email: user.email,
      industry: user.industry,
      emailResult: body.email,
      error: body.error || null,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return {
      index,
      status: 0,
      ok: false,
      elapsed,
      email: user.email,
      industry: user.industry,
      error: err.message,
    };
  }
}

// ── Fetch dashboard endpoints ───────────────────

async function fetchEndpoint(path) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const elapsed = Math.round(performance.now() - start);
    const body = await res.json();
    return { path, status: res.status, elapsed, data: body, error: null };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return { path, status: 0, elapsed, data: null, error: err.message };
  }
}

// ── Stats helpers ───────────────────────────────

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  RSVP Quiz App — Stress Test");
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Users: ${TOTAL_USERS} in waves of ${WAVE_SIZE}`);
  console.log("=".repeat(60));
  console.log();

  // Generate synthetic users
  const users = generateUsers();
  console.log(`Generated ${users.length} synthetic users across ${INDUSTRY_DISTRIBUTION.length} industries`);

  // Industry breakdown
  const industryCounts = {};
  for (const u of users) {
    industryCounts[u.industry] = (industryCounts[u.industry] || 0) + 1;
  }
  console.log("\nIndustry distribution:");
  for (const [ind, count] of Object.entries(industryCounts)) {
    console.log(`  ${ind}: ${count}`);
  }
  console.log();

  // ── Phase 1: Submit all users in waves ──
  console.log("PHASE 1: Submitting quiz responses");
  console.log("-".repeat(40));

  const allResults = [];
  const totalStart = performance.now();

  for (let wave = 0; wave < Math.ceil(users.length / WAVE_SIZE); wave++) {
    const start = wave * WAVE_SIZE;
    const end = Math.min(start + WAVE_SIZE, users.length);
    const batch = users.slice(start, end);

    const waveStart = performance.now();
    const results = await Promise.all(
      batch.map((user, i) => submitUser(user, start + i))
    );
    const waveElapsed = Math.round(performance.now() - waveStart);

    const successes = results.filter((r) => r.ok).length;
    const failures = results.filter((r) => !r.ok).length;
    const avgMs = Math.round(results.reduce((s, r) => s + r.elapsed, 0) / results.length);

    console.log(
      `  Wave ${wave + 1}/${Math.ceil(users.length / WAVE_SIZE)}: ` +
      `${successes} ok, ${failures} failed, ` +
      `avg ${avgMs}ms, wave ${waveElapsed}ms`
    );

    // Log any failures
    for (const r of results) {
      if (!r.ok) {
        console.log(`    FAIL [${r.status}] ${r.email}: ${r.error}`);
      }
    }

    allResults.push(...results);

    // Stagger waves to simulate realistic arrival pattern
    if (wave < Math.ceil(users.length / WAVE_SIZE) - 1) {
      await sleep(WAVE_DELAY_MS);
    }
  }

  const totalElapsed = Math.round(performance.now() - totalStart);

  // ── Phase 1 Summary ──
  console.log();
  console.log("PHASE 1 SUMMARY");
  console.log("-".repeat(40));

  const times = allResults.map((r) => r.elapsed);
  const successes = allResults.filter((r) => r.ok).length;
  const failures = allResults.filter((r) => !r.ok).length;

  console.log(`  Total time:   ${(totalElapsed / 1000).toFixed(1)}s`);
  console.log(`  Successes:    ${successes}/${TOTAL_USERS}`);
  console.log(`  Failures:     ${failures}/${TOTAL_USERS}`);
  console.log(`  p50 latency:  ${percentile(times, 50)}ms`);
  console.log(`  p95 latency:  ${percentile(times, 95)}ms`);
  console.log(`  p99 latency:  ${percentile(times, 99)}ms`);
  console.log(`  Min latency:  ${Math.min(...times)}ms`);
  console.log(`  Max latency:  ${Math.max(...times)}ms`);

  // Email delivery stats
  const emailSent = allResults.filter((r) => r.emailResult?.sent).length;
  const emailFailed = allResults.filter((r) => r.emailResult?.error).length;
  console.log(`  Emails sent:  ${emailSent}`);
  console.log(`  Emails failed:${emailFailed}`);

  // ── Phase 2: Dashboard load test ──
  console.log();
  console.log("PHASE 2: Dashboard endpoint load test");
  console.log("-".repeat(40));

  // Hit results and insights endpoints multiple times
  const dashResults = [];
  for (let i = 0; i < 6; i++) {
    const [resultsRes, insightsRes] = await Promise.all([
      fetchEndpoint("/api/results"),
      fetchEndpoint("/api/insights"),
    ]);

    console.log(
      `  Poll ${i + 1}/6: ` +
      `results ${resultsRes.status} (${resultsRes.elapsed}ms), ` +
      `insights ${insightsRes.status} (${insightsRes.elapsed}ms)` +
      (resultsRes.data?.total ? ` — ${resultsRes.data.total} total responses` : "")
    );

    dashResults.push(resultsRes, insightsRes);

    if (i < 5) await sleep(2000);
  }

  // Dashboard summary
  const resultsTimes = dashResults.filter((r) => r.path === "/api/results").map((r) => r.elapsed);
  const insightsTimes = dashResults.filter((r) => r.path === "/api/insights").map((r) => r.elapsed);

  console.log();
  console.log("PHASE 2 SUMMARY");
  console.log("-".repeat(40));
  console.log(`  /api/results  — avg ${Math.round(resultsTimes.reduce((a, b) => a + b, 0) / resultsTimes.length)}ms, max ${Math.max(...resultsTimes)}ms`);
  console.log(`  /api/insights — avg ${Math.round(insightsTimes.reduce((a, b) => a + b, 0) / insightsTimes.length)}ms, max ${Math.max(...insightsTimes)}ms`);

  // ── Verdict ──
  console.log();
  console.log("=".repeat(60));
  console.log("  VERDICT");
  console.log("=".repeat(60));

  const p99 = percentile(times, 99);
  const failRate = failures / TOTAL_USERS;

  if (failRate > 0.05) {
    console.log("  FAIL — More than 5% of submissions failed.");
    console.log(`  ${failures} failures out of ${TOTAL_USERS} submissions.`);
    console.log("  Action: Check Supabase connection pool limits and Netlify function concurrency.");
  } else if (p99 > 8000) {
    console.log("  WARN — p99 latency exceeds 8 seconds.");
    console.log(`  p99: ${p99}ms. Some users may experience timeouts.`);
    console.log("  Action: Consider upgrading Supabase tier or adding retry logic.");
  } else if (failRate > 0) {
    console.log(`  WARN — ${failures} submission(s) failed, but under 5% threshold.`);
    console.log("  Monitor during event. Consider adding client-side retry.");
  } else {
    console.log("  PASS — All submissions succeeded within acceptable latency.");
  }

  console.log();
  console.log(`  Submit p50: ${percentile(times, 50)}ms | p95: ${percentile(times, 95)}ms | p99: ${p99}ms`);
  console.log(`  Failure rate: ${(failRate * 100).toFixed(1)}%`);
  console.log();
  console.log("  Cleanup: Run this in Supabase SQL Editor:");
  console.log("  DELETE FROM responses WHERE email LIKE '%@stresstest.invalid';");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Stress test crashed:", err);
  process.exit(1);
});
