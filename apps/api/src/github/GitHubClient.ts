import { GitHubRateLimit, GitHubRepo, GitHubSearchUsersResult, GitHubUser } from "@gitscout/shared";

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

/**
 * GitHubClient — authenticated wrapper around the GitHub REST API.
 *
 * Responsibilities:
 *  - Attach auth headers
 *  - Respect Accept headers (json / raw)
 *  - Expose rate-limit state
 *  - Exponential-backoff retry on 429 / 5xx
 *  - Never scrape HTML pages
 */
export class GitHubClient {
  private readonly token: string;
  private rateLimit: GitHubRateLimit = {
    limit: 5000,
    remaining: 5000,
    reset: 0,
    used: 0,
  };

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || "";
    if (!this.token) {
      console.warn(
        "[GitHubClient] No GITHUB_TOKEN provided. Requests will be rate-limited to 60/hour."
      );
    }
  }

  // ─── Public accessors ──────────────────────────────────────────────────────

  getRateLimit(): GitHubRateLimit {
    return { ...this.rateLimit };
  }

  isRateLimited(): boolean {
    return this.rateLimit.remaining <= 0 && Date.now() / 1000 < this.rateLimit.reset;
  }

  getRateLimitResetMs(): number {
    return Math.max(0, this.rateLimit.reset * 1000 - Date.now());
  }

  // ─── API methods ───────────────────────────────────────────────────────────

  /** Search GitHub users using the Search API */
  async searchUsers(
    query: string,
    options: { perPage?: number; page?: number } = {}
  ): Promise<GitHubSearchUsersResult> {
    const params = new URLSearchParams({
      q: query,
      per_page: String(options.perPage ?? 30),
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
    options: { perPage?: number; page?: number } = {}
  ): Promise<GitHubRepo[]> {
    const params = new URLSearchParams({
      sort: "updated",
      direction: "desc",
      per_page: String(options.perPage ?? 30),
      page: String(options.page ?? 1),
      type: "owner",
    });
    return this.get<GitHubRepo[]>(`/users/${username}/repos?${params}`);
  }

  /** Fetch current rate-limit status from the API */
  async fetchRateLimit(): Promise<GitHubRateLimit> {
    const data = await this.get<{ rate: GitHubRateLimit }>("/rate_limit");
    this.rateLimit = data.rate;
    return data.rate;
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
      throw new Error(`[GitHubClient] Network error fetching ${path}: ${String(err)}`);
    } finally {
      clearTimeout(timeout);
    }

    // Update stored rate-limit from response headers
    this.updateRateLimitFromHeaders(response.headers);

    // ── Handle rate limit (403 or 429) ───────────────────────────────────────
    if (response.status === 403 || response.status === 429) {
      const resetMs = this.getRateLimitResetMs();
      if (attempt < MAX_RETRIES && resetMs < 60_000) {
        // Only auto-retry if reset is < 1 min away
        console.warn(`[GitHubClient] Rate limited. Retrying after ${Math.ceil(resetMs / 1000)}s`);
        await this.sleep(resetMs + 500);
        return this.get<T>(path, attempt + 1);
      }
      throw new Error(
        `[GitHubClient] Rate limit exceeded. Resets at ${new Date(this.rateLimit.reset * 1000).toISOString()}`
      );
    }

    // ── Handle 5xx server errors ──────────────────────────────────────────────
    if (response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await this.sleep(this.backoffMs(attempt));
        return this.get<T>(path, attempt + 1);
      }
      throw new Error(`[GitHubClient] GitHub server error ${response.status} on ${path}`);
    }

    // ── Handle 404 / other client errors ─────────────────────────────────────
    if (!response.ok) {
      let errorBody = "";
      try {
        const json = (await response.json()) as { message?: string };
        errorBody = json.message ?? "";
      } catch {
        // ignore parse errors
      }
      throw new Error(
        `[GitHubClient] HTTP ${response.status} on ${path}${errorBody ? `: ${errorBody}` : ""}`
      );
    }

    return response.json() as Promise<T>;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private updateRateLimitFromHeaders(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const used = headers.get("x-ratelimit-used");

    if (limit) this.rateLimit.limit = Number(limit);
    if (remaining) this.rateLimit.remaining = Number(remaining);
    if (reset) this.rateLimit.reset = Number(reset);
    if (used) this.rateLimit.used = Number(used);
  }

  private backoffMs(attempt: number): number {
    // Exponential back-off: 1s, 2s, 4s …
    return Math.min(1000 * 2 ** (attempt - 1), 10_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
