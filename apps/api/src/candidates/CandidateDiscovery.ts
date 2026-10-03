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

const CONCURRENCY_LIMIT = 3; // max parallel enrichment requests
const REPOS_PER_USER = 30;   // how many repos to fetch per user
const MAX_USERS_PER_QUERY = 30; // GitHub returns up to 100; we cap at 30 for MVP

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
   * Run all planned GitHub queries and return deduplicated candidate references.
   */
  async search(
    _criteria: SearchCriteria,
    plan: SearchPlan,
    onProgress?: (msg: string, found: number) => void
  ): Promise<CandidateReference[]> {
    const seen = new Set<string>();
    const refs: CandidateReference[] = [];

    for (const query of plan.githubQueries) {
      if (this.github.isRateLimited()) {
        const waitMs = this.github.getRateLimitResetMs();
        console.warn(`[CandidateDiscovery] Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
        onProgress?.(`Rate limit hit, waiting ${Math.ceil(waitMs / 1000)}s…`, refs.length);
        await this.sleep(waitMs + 500);
      }

      try {
        onProgress?.(`Searching: ${query}`, refs.length);
        const result = await this.github.searchUsers(query, {
          perPage: MAX_USERS_PER_QUERY,
        });

        for (const item of result.items) {
          if (!seen.has(item.login)) {
            seen.add(item.login);
            refs.push({
              username: item.login,
              source: "github",
              profileUrl: item.html_url,
            });
          }
        }

        // GitHub Search API secondary rate limit: 1 request/second recommended
        await this.sleep(1100);
      } catch (err) {
        console.error(`[CandidateDiscovery] Query failed: "${query}"`, err);
        // Continue with remaining queries even if one fails
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
    const limit = pLimit(CONCURRENCY_LIMIT);
    const results: Candidate[] = [];
    let enriched = 0;

    const tasks = refs.map((ref) =>
      limit(async () => {
        try {
          if (this.github.isRateLimited()) {
            const waitMs = this.github.getRateLimitResetMs();
            await this.sleep(waitMs + 500);
          }

          const candidate = await this.enrich(ref);
          results.push(candidate);
          enriched++;
          onProgress?.(`Enriched ${ref.username}`, enriched);
          return candidate;
        } catch (err) {
          console.error(`[CandidateDiscovery] Failed to enrich ${ref.username}:`, err);
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

    const languages = this.extractLanguages(ownedRepos);
    const topics = this.extractTopics(ownedRepos);
    const repositories = ownedRepos.map((r) => this.mapRepo(r));

    return {
      id: `github:${user.login}`,
      username: user.login,
      name: user.name ?? undefined,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      bio: user.bio ?? undefined,
      location: user.location ?? undefined,
      company: user.company?.replace(/^@/, "") ?? undefined,
      website: user.blog ?? undefined,

      followers: user.followers,
      publicRepos: user.public_repos,

      languages,
      topics,
      repositories,

      source: "github",
      createdAt: new Date(),
    };
  }

  private mapRepo(repo: GitHubRepo): Repository {
    return {
      name: repo.name,
      url: repo.html_url,
      description: repo.description ?? undefined,
      language: repo.language ?? undefined,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : undefined,
    };
  }

  private extractLanguages(repos: GitHubRepo[]): string[] {
    const counts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        counts[repo.language] = (counts[repo.language] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);
  }

  private extractTopics(repos: GitHubRepo[]): string[] {
    const seen = new Set<string>();
    for (const repo of repos) {
      for (const topic of repo.topics ?? []) {
        seen.add(topic);
      }
    }
    return [...seen];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
