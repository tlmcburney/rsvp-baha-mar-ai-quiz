import { questions } from "./questions.mjs";

/**
 * Aggregate an array of response rows into per-question yes/no counts,
 * overall and broken down by industry.
 *
 * @param {Array} rows — Supabase rows with { industry, answers }
 * @returns {{ total, questions, industries }}
 */
export function aggregate(rows) {
  const total = rows.length;

  // Per-question overall counts
  const questionStats = questions.map((q) => {
    let yes = 0;
    let no = 0;
    for (const row of rows) {
      const answer = row.answers?.[q.id];
      if (answer === "yes") yes++;
      else if (answer === "no") no++;
    }
    return {
      id: q.id,
      text: q.text,
      yes,
      no,
      yesPct: total > 0 ? Math.round((yes / total) * 100) : 0,
      noPct: total > 0 ? Math.round((no / total) * 100) : 0,
    };
  });

  // Industry breakdown: { "Photographer": { count, questions: { a1: { yes, no }, ... } } }
  const industryMap = {};
  for (const row of rows) {
    const ind = row.industry || "Other";
    if (!industryMap[ind]) {
      industryMap[ind] = { count: 0, questions: {} };
    }
    industryMap[ind].count++;

    for (const q of questions) {
      if (!industryMap[ind].questions[q.id]) {
        industryMap[ind].questions[q.id] = { yes: 0, no: 0 };
      }
      const answer = row.answers?.[q.id];
      if (answer === "yes") industryMap[ind].questions[q.id].yes++;
      else if (answer === "no") industryMap[ind].questions[q.id].no++;
    }
  }

  // Convert to sorted array
  const industryStats = Object.entries(industryMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      questions: data.questions,
    }))
    .sort((a, b) => b.count - a.count);

  return { total, questions: questionStats, industries: industryStats };
}
