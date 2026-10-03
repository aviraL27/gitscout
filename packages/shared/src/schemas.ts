import { z } from "zod";

// ─── Repository schema ────────────────────────────────────────────────────────

export const RepositorySchema = z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
  language: z.string().optional(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  topics: z.array(z.string()),
  updatedAt: z.coerce.date().optional(),
});

// ─── Candidate schema ─────────────────────────────────────────────────────────

export const CandidateSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  profileUrl: z.string().url(),
  bio: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),

  followers: z.number().int().nonnegative(),
  publicRepos: z.number().int().nonnegative(),

  languages: z.array(z.string()),
  topics: z.array(z.string()),
  repositories: z.array(RepositorySchema),

  relevanceScore: z.number().int().min(0).max(100).optional(),
  relevanceReason: z.string().optional(),
  matchingSkills: z.array(z.string()).optional(),
  evidence: z.array(z.string()).optional(),

  signals: z
    .object({
      locationMatch: z.boolean(),
      skillMatch: z.boolean(),
      languageMatch: z.boolean(),
      repositoryEvidence: z.boolean(),
      recentActivity: z.boolean(),
    })
    .optional(),

  outreachDraft: z
    .object({
      subject: z.string(),
      body: z.string(),
    })
    .optional(),

  source: z.literal("github"),
  createdAt: z.coerce.date(),
});

// ─── Search schemas ───────────────────────────────────────────────────────────

export const SearchCriteriaSchema = z.object({
  requirement: z.string().min(5, "Please describe what you are looking for"),
  locationScope: z.string().min(1, "Location scope is required"),
  languages: z.array(z.string()).optional(),
  minRelevance: z.number().int().min(0).max(100).optional(),
});

export const SearchPlanSchema = z.object({
  locationScope: z.string(),
  keywords: z.array(z.string()),
  languages: z.array(z.string()),
  githubQueries: z.array(z.string()),
});

// ─── API request / response schemas ──────────────────────────────────────────

export const PostSearchRequestSchema = z.object({
  requirement: z.string().min(5),
  locationScope: z.string().default("India"),
  languages: z.array(z.string()).optional(),
  minRelevance: z.number().int().min(0).max(100).optional(),
});

export type PostSearchRequest = z.infer<typeof PostSearchRequestSchema>;
export type RepositoryType = z.infer<typeof RepositorySchema>;
export type CandidateType = z.infer<typeof CandidateSchema>;
export type SearchCriteriaType = z.infer<typeof SearchCriteriaSchema>;
export type SearchPlanType = z.infer<typeof SearchPlanSchema>;
