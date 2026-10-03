// ─── Repository ──────────────────────────────────────────────────────────────

export interface Repository {
  name: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt?: Date;
}

// ─── Candidate ───────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  profileUrl: string;
  bio?: string;
  location?: string;
  company?: string;
  website?: string;

  followers: number;
  publicRepos: number;

  languages: string[];
  topics: string[];
  repositories: Repository[];

  // Populated in Phase 3 (Gemma evaluation)
  relevanceScore?: number;
  relevanceReason?: string;
  matchingSkills?: string[];
  evidence?: string[];

  // Score breakdown signals (populated in Phase 3)
  signals?: {
    locationMatch: boolean;
    skillMatch: boolean;
    languageMatch: boolean;
    repositoryEvidence: boolean;
    recentActivity: boolean;
  };

  source: "github";
  createdAt: Date;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchCriteria {
  /** Natural-language requirement from the user */
  requirement: string;
  /** Location scope — e.g. "India", "United States", "Worldwide" */
  locationScope: string;
  /** Programming languages to filter on */
  languages?: string[];
  /** Minimum relevance score 0-100 (applied in Phase 3) */
  minRelevance?: number;
}

export interface SearchPlan {
  locationScope: string;
  keywords: string[];
  languages: string[];
  githubQueries: string[];
}

// ─── Search Job ───────────────────────────────────────────────────────────────

export type SearchStatus =
  | "pending"
  | "planning"
  | "searching"
  | "enriching"
  | "evaluating"
  | "complete"
  | "error";

export interface SearchJob {
  id: string;
  criteria: SearchCriteria;
  plan?: SearchPlan;
  status: SearchStatus;
  progress: {
    message: string;
    found: number;
    enriched: number;
    evaluated: number;
  };
  candidates: Candidate[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── CandidateSource interface (extensibility hook) ───────────────────────────

export interface CandidateReference {
  username: string;
  source: "github";
  profileUrl: string;
}

export interface CandidateSource {
  search(criteria: SearchCriteria, plan: SearchPlan): Promise<CandidateReference[]>;
  enrich(ref: CandidateReference): Promise<Candidate>;
}

// ─── GitHub API types ─────────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  pushed_at: string;
}

export interface GitHubSearchUsersResult {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
    score: number;
  }>;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // unix timestamp
  used: number;
}
