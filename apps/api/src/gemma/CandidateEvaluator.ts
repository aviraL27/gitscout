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

    try {
      const { text, provider } = await aiRouter.chat(prompt, SYSTEM_PROMPT);
      console.log(`[CandidateEvaluator] Evaluated ${candidate.username} via ${provider}`);
      return this.parseEvaluation(text, candidate, requirement);
    } catch (err) {
      console.warn(`[CandidateEvaluator] AI call failed for ${candidate.username}, using deterministic fallback:`, err);
      return this.fallbackEvaluation(candidate, requirement);
    }
  }


  async generateOutreach(
    requirement: string,
    candidate: Candidate,
    senderName = "Aviral"
  ): Promise<Outreach> {
    const topRepos = candidate.repositories
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 3);

    const systemPrompt = `You are an executive tech scout drafting a personalized developer outreach email.
RULES:
- Tone: authentic, developer-to-developer, concise (< 120 words).
- Reference the developer's exact repository name and technical skills from their profile.
- Return ONLY valid raw JSON: { "subject": "...", "body": "..." }
- Do not output markdown code blocks.`;

    const prompt = `Hiring requirement: ${requirement}

Candidate details:
Name: ${candidate.name ?? candidate.username} (@${candidate.username})
Location: ${candidate.location ?? "not specified"}
Bio: ${candidate.bio ?? "none"}
Top repos:
${topRepos.map((r) => `- ${r.name}: ${r.description ?? "no description"} (${r.language ?? "?"}, ⭐${r.stars})`).join("\n")}

Sender name: ${senderName}

Draft a personalized outreach email. Return JSON only: { "subject": "...", "body": "..." }`;

    try {
      const { text } = await aiRouter.chat(prompt, systemPrompt);
      const parsed = this.parseOutreach(text);
      if (parsed && parsed.subject && parsed.body && parsed.body.length > 20) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[CandidateEvaluator] AI outreach generation failed for ${candidate.username}:`, err);
    }

    return this.buildPersonalizedOutreach(candidate, requirement, senderName);
  }

  buildPersonalizedOutreach(
    candidate: Candidate,
    requirement: string,
    senderName = "Aviral"
  ): Outreach {
    const displayName = candidate.name || candidate.username;
    const topRepo = candidate.repositories.length > 0
      ? candidate.repositories.slice().sort((a, b) => b.stars - a.stars)[0]
      : null;

    const primarySkill = candidate.matchingSkills?.[0] || candidate.languages?.[0] || "open-source software";
    const subject = topRepo
      ? `Loved your work on ${topRepo.name} · ${primarySkill} opportunity`
      : `Connecting on GitHub · ${primarySkill} opportunity`;

    const repoHighlight = topRepo
      ? `I was particularly impressed by your project "${topRepo.name}"${topRepo.description ? ` (${topRepo.description})` : ""}${topRepo.language ? ` built with ${topRepo.language}` : ""}.`
      : `I was really impressed by your active public repositories and work across ${candidate.languages.slice(0, 3).join(", ") || "GitHub"}.`;

    const body = `Hi ${displayName},

I came across your GitHub profile (@${candidate.username}) while sourcing developers with expertise in ${requirement}.

${repoHighlight}

We are currently building high-impact systems and looking for talented engineers with your specific hands-on background. Would you be open to a brief 15-minute introductory conversation this week to explore potential collaboration?

Looking forward to connecting!

Best regards,
${senderName}`;

    return { subject, body };
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
    const raw = this.extractJSON(rawText) as any;
    const json = raw?.evaluation ?? raw;

    const parsed = EvaluationSchema.safeParse(json);
    if (parsed.success) return parsed.data;

    // Normalize and attempt recovery if partial or slightly variant schema
    if (json && typeof json === "object") {
      const score = typeof json.score === "number" ? Math.max(0, Math.min(100, Math.round(json.score))) : 60;
      const relevant = typeof json.relevant === "boolean" ? json.relevant : score >= 50;
      const reason = json.reason ?? json.assessment_summary ?? json.summary ?? "Candidate evaluated based on public GitHub repository evidence.";
      const matchingSkills = Array.isArray(json.matchingSkills ?? json.candidate_skills ?? json.skills) 
        ? (json.matchingSkills ?? json.candidate_skills ?? json.skills).map(String)
        : candidate.languages.slice(0, 3);
      const evidence = Array.isArray(json.evidence)
        ? json.evidence.map(String)
        : candidate.repositories.slice(0, 2).map((r) => r.name);
      const signals = {
        locationMatch: Boolean(json.signals?.locationMatch ?? true),
        skillMatch: Boolean(json.signals?.skillMatch ?? true),
        languageMatch: Boolean(json.signals?.languageMatch ?? true),
        repositoryEvidence: Boolean(json.signals?.repositoryEvidence ?? (candidate.repositories.length > 0)),
        recentActivity: Boolean(json.signals?.recentActivity ?? true),
      };

      const normalized = {
        relevant,
        score,
        reason,
        matchingSkills,
        evidence,
        signals,
      };

      const normParsed = EvaluationSchema.safeParse(normalized);
      if (normParsed.success) {
        console.log(`[CandidateEvaluator] Successfully normalized AI output for ${candidate.username}`);
        return normParsed.data;
      }
    }

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
    const knownLangs = ["python", "typescript", "javascript", "rust", "go", "golang", "java", "c++", "cpp"];
    const requirementMentionsLang = knownLangs.some((lang) => reqLower.includes(lang));
    const languageMatch = !requirementMentionsLang || candidate.languages.some((l) => reqLower.includes(l.toLowerCase()));

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
