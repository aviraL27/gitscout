import { Candidate, Repository } from "@gitscout/shared";
import { aiRouter, EvaluationSchema, OutreachSchema, type Evaluation, type Outreach } from "./AIRouter";

const SYSTEM_PROMPT = `You are a precise technical evaluator assessing GitHub developer profiles for a talent search.

You MUST:
- Only use information explicitly present in the GitHub data provided
- Never invent or assume skills, experience, or accomplishments not visible in the data
- Return ONLY valid JSON matching the exact schema requested
- Be conservative: if evidence is weak, score lower
- Distinguish between: direct evidence (repo exists), inference (topic tags), and absence (nothing found)

Do NOT wrap in markdown code blocks. Return raw JSON only.`;

/**
 * CandidateEvaluator
 *
 * Uses Gemma 4 (local via Ollama, fallback via Gemini API) to evaluate
 * candidate profiles against the user's requirement.
 *
 * Scoring framework (transparent signals, not arbitrary):
 *   locationMatch      +20 pts  — profile location matches search scope
 *   skillMatch         +25 pts  — bio/repos mention required technologies
 *   languageMatch      +15 pts  — primary language matches requirement
 *   repositoryEvidence +25 pts  — actual repos demonstrating the skills
 *   recentActivity     +15 pts  — pushed commits in last 6 months
 */
export class CandidateEvaluator {
  async evaluate(
    requirement: string,
    candidate: Candidate
  ): Promise<Evaluation> {
    const prompt = this.buildEvaluationPrompt(requirement, candidate);

    const { text, provider } = await aiRouter.chat(prompt, SYSTEM_PROMPT);
    console.log(`[CandidateEvaluator] Evaluated ${candidate.username} via ${provider}`);

    return this.parseEvaluation(text, candidate, requirement);
  }

  async generateOutreach(
    requirement: string,
    candidate: Candidate,
    senderName = "Aviral"
  ): Promise<Outreach> {
    const topRepos = candidate.repositories
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 3);

    const systemPrompt = `You are drafting a professional outreach email. 
RULES:
- Only reference information explicitly visible in the GitHub profile provided
- Never fabricate accomplishments, company names, or experience
- Be specific about ONE repository that's most relevant
- Keep body under 120 words
- Tone: direct, genuine, developer-to-developer
- Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    const prompt = `Requirement context: ${requirement}

Candidate GitHub profile:
Name: ${candidate.name ?? candidate.username}
Location: ${candidate.location ?? "not specified"}
Bio: ${candidate.bio ?? "none"}
Top repos:
${topRepos.map((r) => `- ${r.name}: ${r.description ?? "no description"} (${r.language ?? "?"}, ⭐${r.stars})`).join("\n")}

Sender name: ${senderName}

Write a short outreach email. Return only JSON: { "subject": "...", "body": "..." }`;

    const { text } = await aiRouter.chat(prompt, systemPrompt);
    return this.parseOutreach(text);
  }

  // ─── Prompt builders ────────────────────────────────────────────────────────

  private buildEvaluationPrompt(requirement: string, candidate: Candidate): string {
    const relevantRepos = this.selectRelevantRepos(candidate.repositories, requirement);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentlyActive = relevantRepos.some(
      (r) => r.updatedAt && new Date(r.updatedAt) > sixMonthsAgo
    );

    return `Evaluate this GitHub developer profile against the hiring requirement.

REQUIREMENT:
${requirement}

CANDIDATE PROFILE:
Username: ${candidate.username}
Name: ${candidate.name ?? "not provided"}
Location: ${candidate.location ?? "not provided"}
Bio: ${candidate.bio ?? "none"}
Followers: ${candidate.followers}
Public repos: ${candidate.publicRepos}
Primary languages: ${candidate.languages.slice(0, 5).join(", ") || "none detected"}
Repository topics: ${candidate.topics.slice(0, 10).join(", ") || "none"}

REPOSITORIES (top relevant):
${relevantRepos.map((r) => `- ${r.name} [${r.language ?? "?"}] ⭐${r.stars}
  ${r.description ?? "no description"}
  Topics: ${r.topics.join(", ") || "none"}
  Last updated: ${r.updatedAt ? new Date(r.updatedAt).toISOString().split("T")[0] : "unknown"}`).join("\n\n")}

Recently active (last 6 months): ${recentlyActive ? "yes" : "no"}

SCORING FRAMEWORK (be transparent):
- locationMatch: does location mention the required country/city?
- skillMatch: does bio or repo descriptions mention required technologies?
- languageMatch: do primary languages match requirement?
- repositoryEvidence: are there actual repos demonstrating required skills?
- recentActivity: any updates in last 6 months?

Score 0-100 where: 0-40=not relevant, 41-65=weak, 66-80=good, 81-100=strong

Return this exact JSON structure:
{
  "relevant": <boolean, true if score >= 50>,
  "score": <integer 0-100>,
  "reason": "<1-2 sentences based only on visible evidence>",
  "matchingSkills": ["<skill1>", ...],
  "evidence": ["<specific repo or bio quote>", ...],
  "signals": {
    "locationMatch": <boolean>,
    "skillMatch": <boolean>,
    "languageMatch": <boolean>,
    "repositoryEvidence": <boolean>,
    "recentActivity": <boolean>
  }
}`;
  }

  private selectRelevantRepos(repos: Repository[], requirement: string): Repository[] {
    const reqLower = requirement.toLowerCase();
    // Score repos by relevance to requirement
    const scored = repos.map((r) => {
      let score = r.stars * 0.1;
      const text = `${r.name} ${r.description ?? ""} ${r.topics.join(" ")}`.toLowerCase();
      const keywords = reqLower.split(/\s+/).filter((w) => w.length > 3);
      for (const kw of keywords) {
        if (text.includes(kw)) score += 10;
      }
      return { repo: r, score };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.repo);
  }

  // ─── Parsers ────────────────────────────────────────────────────────────────

  private parseEvaluation(rawText: string, candidate: Candidate, requirement: string): Evaluation {
    const json = this.extractJSON(rawText);

    const parsed = EvaluationSchema.safeParse(json);
    if (parsed.success) return parsed.data;

    // Graceful degradation — compute basic signals deterministically
    console.warn(`[CandidateEvaluator] Schema validation failed for ${candidate.username}, using fallback`);
    return this.fallbackEvaluation(candidate, requirement);
  }

  private parseOutreach(rawText: string): Outreach {
    const json = this.extractJSON(rawText);
    const parsed = OutreachSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    // Fallback
    return {
      subject: "Interesting work on GitHub",
      body: rawText.slice(0, 500),
    };
  }

  private extractJSON(text: string): unknown {
    // Strip markdown code fences if present
    const stripped = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    // Find first { ... } block
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1) return {};

    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return {};
    }
  }

  private fallbackEvaluation(candidate: Candidate, requirement: string): Evaluation {
    const reqLower = requirement.toLowerCase();
    const profileText = `${candidate.bio ?? ""} ${candidate.topics.join(" ")} ${candidate.languages.join(" ")} ${
      candidate.repositories.map((r) => `${r.name} ${r.description ?? ""} ${r.topics.join(" ")}`).join(" ")
    }`.toLowerCase();

    const skillMatch = /llm|rag|machine learning|ai|ml|python|fastapi|langchain/i.test(profileText);
    const locationMatch = /india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai/i.test(
      candidate.location ?? ""
    );
    const languageMatch = candidate.languages.some((l) =>
      reqLower.includes(l.toLowerCase())
    );
    const repositoryEvidence = candidate.repositories.length > 0;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentActivity = candidate.repositories.some(
      (r) => r.updatedAt && new Date(r.updatedAt) > sixMonthsAgo
    );

    const signals = { locationMatch, skillMatch, languageMatch, repositoryEvidence, recentActivity };
    const score =
      (locationMatch ? 20 : 0) +
      (skillMatch ? 25 : 0) +
      (languageMatch ? 15 : 0) +
      (repositoryEvidence ? 25 : 0) +
      (recentActivity ? 15 : 0);

    return {
      relevant: score >= 50,
      score,
      reason: `Deterministic fallback evaluation. ${skillMatch ? "Profile shows relevant technical keywords." : "Limited technical signal found."}`,
      matchingSkills: candidate.languages.slice(0, 3),
      evidence: candidate.repositories.slice(0, 2).map((r) => r.name),
      signals,
    };
  }
}

export const candidateEvaluator = new CandidateEvaluator();
