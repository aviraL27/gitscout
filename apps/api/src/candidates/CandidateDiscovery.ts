import pLimit from "p-limit";
import {
  Candidate,
  CandidateReference,
  CandidateSource,
  GitHubRepo,
  GitHubUser,
  Repository,
  SearchCriteria,
  SearchPlan,
} from "@gitscout/shared";
import { GitHubClient } from "../github/GitHubClient";

const CONCURRENCY_LIMIT = 4;        // max parallel enrichment requests
const REPOS_PER_USER = 15;          // top 15 recent repos per candidate
const MAX_CANDIDATES_TO_ENRICH = 20; // cap for MVP discovery to ensure fast, reliable searches

/**
 * CandidateDiscovery
 *
 * Implements the CandidateSource interface for GitHub.
 * Responsibility:
 *  - Execute search queries
 *  - Collect & deduplicate usernames
 *  - Enrich each candidate with profile + repo data
 */
export class CandidateDiscovery implements CandidateSource {
  constructor(private readonly github: GitHubClient) {}

  // ─── CandidateSource interface ────────────────────────────────────────────

  /**
   * Run planned GitHub queries and return deduplicated candidate references.
   */
  async search(
    _criteria: SearchCriteria,
    plan: SearchPlan,
    onProgress?: (msg: string, found: number) => void
  ): Promise<CandidateReference[]> {
    const seen = new Set<string>();
    const refs: CandidateReference[] = [];

    for (const query of plan.githubQueries) {
      if (refs.length >= MAX_CANDIDATES_TO_ENRICH) {
        break; // Reached candidate discovery target
      }

      if (this.github.isRateLimited("search")) {
        const waitMs = this.github.getRateLimitResetMs("search");
        if (waitMs > 5000) {
          console.warn(`[CandidateDiscovery] Search rate limit reached (${Math.ceil(waitMs / 1000)}s reset). Proceeding with ${refs.length} candidates.`);
          break;
        }
        await this.sleep(waitMs + 200);
      }

      try {
        onProgress?.(`Searching: ${query}`, refs.length);
        const result = await this.github.searchUsers(query, { perPage: 15 });

        for (const item of result.items) {
          if (!seen.has(item.login)) {
            seen.add(item.login);
            refs.push({
              username: item.login,
              source: "github",
              profileUrl: item.html_url,
            });
            if (refs.length >= MAX_CANDIDATES_TO_ENRICH) break;
          }
        }

        // GitHub Search API rate limit courtesy pause (1 sec)
        await this.sleep(1000);
      } catch (err) {
        console.error(`[CandidateDiscovery] Query failed: "${query}"`, err);
      }
    }

    return refs;
  }

  /**
   * Enrich a single candidate reference with full GitHub profile + repos.
   */
  async enrich(ref: CandidateReference): Promise<Candidate> {
    const [user, repos] = await Promise.all([
      this.github.getUser(ref.username),
      this.github.getUserRepos(ref.username, { perPage: REPOS_PER_USER }),
    ]);

    return this.buildCandidate(user, repos);
  }

  /**
   * Enrich multiple candidates concurrently (respecting concurrency limit).
   */
  async enrichAll(
    refs: CandidateReference[],
    onProgress?: (msg: string, enriched: number) => void
  ): Promise<Candidate[]> {
    const targetRefs = refs.slice(0, MAX_CANDIDATES_TO_ENRICH);
    const limit = pLimit(CONCURRENCY_LIMIT);
    const results: Candidate[] = [];
    let enriched = 0;

    const tasks = targetRefs.map((ref) =>
      limit(async () => {
        try {
          if (this.github.isRateLimited("core")) {
            const waitMs = this.github.getRateLimitResetMs("core");
            if (waitMs > 5000) {
              console.warn(`[CandidateDiscovery] Core rate limited. Halting further enrichment.`);
              return null;
            }
            await this.sleep(waitMs + 200);
          }

          const candidate = await this.enrich(ref);
          results.push(candidate);
          enriched++;
          onProgress?.(`Enriched ${ref.username}`, enriched);
          return candidate;
        } catch (err) {
          console.warn(`[CandidateDiscovery] Skipping ${ref.username}:`, (err as Error).message);
          return null;
        }
      })
    );

    await Promise.all(tasks);
    return results;
  }

  // ─── Builders ─────────────────────────────────────────────────────────────

  private buildCandidate(user: GitHubUser, repos: GitHubRepo[]): Candidate {
    const ownedRepos = repos.filter((r) => !r.fork);

    // Aggregate unique languages used across repos
    const languageCounts: Record<string, number> = {};
    for (const r of ownedRepos) {
      if (r.language) {
        languageCounts[r.language] = (languageCounts[r.language] ?? 0) + 1;
      }
    }
    const languages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);

    // Aggregate unique topics across repos
    const topicSet = new Set<string>();
    for (const r of ownedRepos) {
      for (const t of r.topics ?? []) {
        topicSet.add(t.toLowerCase());
      }
    }
    const topics = [...topicSet];

    // Normalize repos to domain model
    const normalizedRepos: Repository[] = ownedRepos.map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description ?? undefined,
      language: r.language ?? undefined,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
    }));

    return {
      id: String(user.id),
      username: user.login,
      name: user.name ?? undefined,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      bio: user.bio ?? undefined,
      location: user.location ?? undefined,
      company: user.company ?? undefined,
      website: user.blog || undefined,
      followers: user.followers,
      publicRepos: user.public_repos,
      languages,
      topics,
      repositories: normalizedRepos,
      source: "github",
      createdAt: new Date(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
