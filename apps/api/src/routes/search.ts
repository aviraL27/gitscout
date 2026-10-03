import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { PostSearchRequestSchema } from "@gitscout/shared";
import { SearchPlanner } from "../search/SearchPlanner";
import { CandidateDiscovery } from "../candidates/CandidateDiscovery";
import { GitHubClient } from "../github/GitHubClient";
import { jobStore } from "../db/SearchJobStore";

export const searchRouter = Router();

const github = new GitHubClient();
const planner = new SearchPlanner();
const discovery = new CandidateDiscovery(github);

// ─── POST /api/search ─────────────────────────────────────────────────────────
//
// Creates a new search job and starts processing asynchronously.
// Returns the job ID immediately so the frontend can poll.

searchRouter.post("/", async (req: Request, res: Response) => {
  const parsed = PostSearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const criteria = {
    requirement: parsed.data.requirement,
    locationScope: parsed.data.locationScope,
    languages: parsed.data.languages,
    minRelevance: parsed.data.minRelevance,
  };

  const jobId = uuidv4();
  const now = new Date();

  await jobStore.save({
    id: jobId,
    criteria,
    status: "pending",
    progress: { message: "Initialising search…", found: 0, enriched: 0, evaluated: 0 },
    candidates: [],
    createdAt: now,
    updatedAt: now,
  });

  // Kick off the async pipeline — do NOT await it
  runSearchPipeline(jobId, criteria).catch((err) => {
    console.error(`[search] Pipeline error for job ${jobId}:`, err);
    jobStore.update(jobId, {
      status: "error",
      error: String(err),
    });
  });

  res.status(202).json({ jobId });
});

// ─── GET /api/search/:id ──────────────────────────────────────────────────────
//
// Poll endpoint — returns job status + results so far.

searchRouter.get("/:id", async (req: Request, res: Response) => {
  const job = await jobStore.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

// ─── GET /api/search ─────────────────────────────────────────────────────────
//
// List recent jobs.

searchRouter.get("/", async (_req: Request, res: Response) => {
  const jobs = await jobStore.list();
  res.json(jobs);
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function runSearchPipeline(
  jobId: string,
  criteria: ReturnType<typeof PostSearchRequestSchema.parse>
): Promise<void> {
  // ── Step 1: Plan queries ─────────────────────────────────────────────────
  await jobStore.update(jobId, {
    status: "planning",
    progress: { message: "Generating search queries…", found: 0, enriched: 0, evaluated: 0 },
  });

  const plan = planner.plan(criteria);
  await jobStore.update(jobId, { plan });

  console.log(`[search:${jobId}] Plan:`, plan);

  // ── Step 2: Execute GitHub searches ──────────────────────────────────────
  await jobStore.update(jobId, {
    status: "searching",
    progress: {
      message: `Searching GitHub with ${plan.githubQueries.length} queries…`,
      found: 0,
      enriched: 0,
      evaluated: 0,
    },
  });

  const refs = await discovery.search(criteria, plan, async (msg, found) => {
    await jobStore.update(jobId, {
      progress: { message: msg, found, enriched: 0, evaluated: 0 },
    });
  });

  console.log(`[search:${jobId}] Found ${refs.length} unique candidates`);

  await jobStore.update(jobId, {
    progress: {
      message: `Found ${refs.length} unique candidates. Enriching profiles…`,
      found: refs.length,
      enriched: 0,
      evaluated: 0,
    },
  });

  // ── Step 3: Enrich candidates ─────────────────────────────────────────────
  await jobStore.update(jobId, { status: "enriching" });

  const candidates = await discovery.enrichAll(refs, async (msg, enriched) => {
    const job = await jobStore.get(jobId);
    await jobStore.update(jobId, {
      progress: {
        message: msg,
        found: refs.length,
        enriched,
        evaluated: 0,
      },
      // Update candidates list progressively
      candidates: [...(job?.candidates ?? [])],
    });
  });

  // ── Step 4: Complete (Phase 3 will add evaluation here) ───────────────────
  await jobStore.update(jobId, {
    status: "complete",
    candidates,
    progress: {
      message: `Complete — ${candidates.length} candidates found`,
      found: refs.length,
      enriched: candidates.length,
      evaluated: 0,
    },
  });

  console.log(`[search:${jobId}] Complete. ${candidates.length} candidates enriched.`);

  // Emit rate-limit info for dev visibility
  const rl = github.getRateLimit();
  console.log(
    `[search:${jobId}] Rate limit: ${rl.remaining}/${rl.limit} remaining (resets ${new Date(rl.reset * 1000).toISOString()})`
  );
}
