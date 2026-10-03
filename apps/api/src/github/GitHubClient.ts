import { GitHubRateLimit, GitHubRepo, GitHubSearchUsersResult, GitHubUser } from "@gitscout/shared";

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;

/**
 * GitHubClient — authenticated wrapper around the GitHub REST API.
 *
 * Responsibilities:
 *  - Dynamic token resolution (never captures undefined env vars at import time)
 *  - Separate tracking for core (5000/hr) and search (30/min) rate limits
 *  - Never sleep indefinitely on rate limit — fail fast if wait > 5s
 *  - Exponential-backoff retry on transient 5xx errors
 */
export class GitHubClient {
  private readonly explicitToken?: string;

  private coreLimit: GitHubRateLimit = {
    limit: 5000,
    remaining: 5000,
    reset: 0,
    used: 0,
  };

  private searchLimit: GitHubRateLimit = {
    limit: 30,
    remaining: 30,
    reset: 0,
    used: 0,
  };

  constructor(token?: string) {
    this.explicitToken = token;
  }

  private get token(): string {
    return this.explicitToken || process.env.GITHUB_TOKEN || "";
  }

  // ─── Public accessors ──────────────────────────────────────────────────────

  getRateLimit(): GitHubRateLimit {
    return { ...this.coreLimit };
  }

  getSearchRateLimit(): GitHubRateLimit {
    return { ...this.searchLimit };
  }

  isRateLimited(resource: "core" | "search" = "core"): boolean {
    const limit = resource === "search" ? this.searchLimit : this.coreLimit;
    return limit.remaining <= 0 && Date.now() / 1000 < limit.reset;
  }

  getRateLimitResetMs(resource: "core" | "search" = "core"): number {
    const limit = resource === "search" ? this.searchLimit : this.coreLimit;
    return Math.max(0, limit.reset * 1000 - Date.now());
  }

  // ─── API methods ───────────────────────────────────────────────────────────

  /** Search GitHub users using the Search API */
  async searchUsers(
    query: string,
    options: { perPage?: number; page?: number } = {}
  ): Promise<GitHubSearchUsersResult> {
    const params = new URLSearchParams({
      q: query,
      per_page: String(options.perPage ?? 15),
      page: String(options.page ?? 1),
    });
    return this.get<GitHubSearchUsersResult>(`/search/users?${params}`);
  }

  /** Fetch a single user's public profile */
  async getUser(username: string): Promise<GitHubUser> {
    return this.get<GitHubUser>(`/users/${username}`);
  }

  /** Fetch a user's public repositories, sorted by most recently updated */
  async getUserRepos(
    username: string,
    options: { perPage?: number } = {}
  ): Promise<GitHubRepo[]> {
    const params = new URLSearchParams({
      sort: "updated",
      direction: "desc",
      per_page: String(options.perPage ?? 15),
      type: "owner",
    });
    return this.get<GitHubRepo[]>(`/users/${username}/repos?${params}`);
  }

  /** Fetch current rate-limit status from the API */
  async fetchRateLimit(): Promise<GitHubRateLimit> {
    const data = await this.get<{ rate: GitHubRateLimit; resources: { core: GitHubRateLimit; search: GitHubRateLimit } }>("/rate_limit");
    if (data.resources?.core) this.coreLimit = data.resources.core;
    if (data.resources?.search) this.searchLimit = data.resources.search;
    return this.coreLimit;
  }

  // ─── Core fetch with retry ─────────────────────────────────────────────────

  private async get<T>(path: string, attempt = 1): Promise<T> {
    const url = `${GITHUB_API_BASE}${path}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GitScout/0.1",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < MAX_RETRIES) {
        await this.sleep(this.backoffMs(attempt));
        return this.get<T>(path, attempt + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    // Update stored rate-limit from response headers
    this.updateRateLimitFromHeaders(response.headers);

    // ── Handle rate limit (403 or 429) ───────────────────────────────────────
    if (response.status === 403 || response.status === 429) {
      const retryAfterSec = Number(response.headers.get("retry-after") ?? 0);
      const isSearch = path.startsWith("/search");
      const resetMs = retryAfterSec > 0 ? retryAfterSec * 1000 : this.getRateLimitResetMs(isSearch ? "search" : "core");

      // Only auto-retry if reset is short (<= 5 seconds)
      if (attempt < MAX_RETRIES && resetMs > 0 && resetMs <= 5000) {
        console.warn(`[GitHubClient] Brief rate limit. Waiting ${Math.ceil(resetMs / 1000)}s...`);
        await this.sleep(resetMs + 200);
        return this.get<T>(path, attempt + 1);
      }

      throw new Error(`[GitHubClient] Rate limit reached on ${path}. Resets in ${Math.ceil(resetMs / 1000)}s`);
    }

    // ── Handle 5xx server errors ──────────────────────────────────────────────
    if (response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await this.sleep(this.backoffMs(attempt));
        return this.get<T>(path, attempt + 1);
      }
      throw new Error(`[GitHubClient] Server error ${response.status} on ${path}`);
    }

    // ── Handle client errors ─────────────────────────────────────────────────
    if (!response.ok) {
      let errorBody = "";
      try {
        const json = (await response.json()) as { message?: string };
        errorBody = json.message ?? "";
      } catch { /* ignore */ }
      throw new Error(`[GitHubClient] HTTP ${response.status} on ${path}${errorBody ? `: ${errorBody}` : ""}`);
    }

    return response.json() as Promise<T>;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private updateRateLimitFromHeaders(headers: Headers): void {
    const resource = headers.get("x-ratelimit-resource") ?? "core";
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const used = headers.get("x-ratelimit-used");

    const target = resource === "search" ? this.searchLimit : this.coreLimit;
    if (limit) target.limit = Number(limit);
    if (remaining) target.remaining = Number(remaining);
    if (reset) target.reset = Number(reset);
    if (used) target.used = Number(used);
  }

  private backoffMs(attempt: number): number {
    return Math.min(500 * 2 ** (attempt - 1), 3000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
