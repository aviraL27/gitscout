import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";
import { Candidate, PostSearchRequestSchema } from "@gitscout/shared";
import { SearchPlanner } from "../search/SearchPlanner";
import { CandidateDiscovery } from "../candidates/CandidateDiscovery";
import { GitHubClient } from "../github/GitHubClient";
import { jobStore } from "../db/SearchJobStore";
import { candidateEvaluator } from "../gemma/CandidateEvaluator";

export const searchRouter = Router();

const github = new GitHubClient();
const planner = new SearchPlanner();
const discovery = new CandidateDiscovery(github);

const EVAL_CONCURRENCY = 2; // Limit parallel Gemma calls to avoid OOM on local GPU

// ─── POST /api/search ─────────────────────────────────────────────────────────

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

  runSearchPipeline(jobId, criteria).catch((err) => {
    console.error(`[search] Pipeline error for job ${jobId}:`, err);
    jobStore.update(jobId, { status: "error", error: String(err) });
  });

  res.status(202).json({ jobId });
});

// ─── GET /api/search/:id ──────────────────────────────────────────────────────

searchRouter.get("/:id", async (req: Request, res: Response) => {
  const job = await jobStore.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

// ─── GET /api/search ─────────────────────────────────────────────────────────

searchRouter.get("/", async (_req: Request, res: Response) => {
  const jobs = await jobStore.list();
  res.json(jobs);
});

// ─── POST /api/search/:id/outreach/:username ─────────────────────────────────

searchRouter.post("/:id/outreach/:username", async (req: Request, res: Response) => {
  const job = await jobStore.get(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const candidate = job.candidates.find((c) => c.username === req.params.username);
  if (!candidate) { res.status(404).json({ error: "Candidate not found in this job" }); return; }

  try {
    const outreach = await candidateEvaluator.generateOutreach(
      job.criteria.requirement,
      candidate,
      req.body.senderName ?? "Aviral"
    );
    res.json(outreach);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function runSearchPipeline(
  jobId: string,
  criteria: ReturnType<typeof PostSearchRequestSchema.parse>
): Promise<void> {
  // Step 1: Plan
  await jobStore.update(jobId, {
    status: "planning",
    progress: { message: "Generating search queries…", found: 0, enriched: 0, evaluated: 0 },
  });
  const plan = planner.plan(criteria);
  await jobStore.update(jobId, { plan });

  // Step 2: Search
  await jobStore.update(jobId, {
    status: "searching",
    progress: { message: `Searching GitHub with ${plan.githubQueries.length} queries…`, found: 0, enriched: 0, evaluated: 0 },
  });

  const refs = await discovery.search(criteria, plan, async (msg, found) => {
    await jobStore.update(jobId, { progress: { message: msg, found, enriched: 0, evaluated: 0 } });
  });

  // Step 3: Enrich
  await jobStore.update(jobId, {
    status: "enriching",
    progress: { message: `Found ${refs.length} candidates. Enriching profiles…`, found: refs.length, enriched: 0, evaluated: 0 },
  });

  let enrichedCount = 0;
  const candidates = await discovery.enrichAll(refs, async (_msg, enriched) => {
    enrichedCount = enriched;
    await jobStore.update(jobId, {
      progress: { message: `Enriching profiles… (${enriched}/${refs.length})`, found: refs.length, enriched, evaluated: 0 },
    });
  });

  if (candidates.length === 0) {
    await jobStore.update(jobId, {
      status: "complete",
      candidates: [],
      progress: {
        message: refs.length > 0 ? "Enrichment completed, but no profiles could be retrieved" : "No candidates found for these queries",
        found: refs.length,
        enriched: 0,
        evaluated: 0,
      },
    });
    return;
  }

  // Step 4: Evaluate with Gemma
  await jobStore.update(jobId, {
    status: "evaluating",
    progress: { message: `Evaluating ${candidates.length} candidates with Gemma 4…`, found: refs.length, enriched: enrichedCount, evaluated: 0 },
  });

  const evalLimit = pLimit(EVAL_CONCURRENCY);
  let evaluatedCount = 0;
  const evaluatedCandidates: Candidate[] = [];

  const evalTasks = candidates.map((candidate) =>
    evalLimit(async () => {
      try {
        const evaluation = await candidateEvaluator.evaluate(criteria.requirement, candidate);
        const enriched: Candidate = {
          ...candidate,
          relevanceScore: evaluation.score,
          relevanceReason: evaluation.reason,
          matchingSkills: evaluation.matchingSkills,
          evidence: evaluation.evidence,
          signals: evaluation.signals,
        };
        evaluatedCandidates.push(enriched);
        evaluatedCount++;
        await jobStore.update(jobId, {
          progress: {
            message: `Evaluating with Gemma… (${evaluatedCount}/${candidates.length}) — @${candidate.username}`,
            found: refs.length,
            enriched: enrichedCount,
            evaluated: evaluatedCount,
          },
          candidates: [...evaluatedCandidates],
        });
        return enriched;
      } catch (err) {
        console.error(`[search] Evaluation failed for ${candidate.username}:`, err);
        evaluatedCandidates.push(candidate);
        return candidate;
      }
    })
  );

  await Promise.all(evalTasks);


  // Sort by relevance score (highest first)
  const minRelevance = criteria.minRelevance ?? 0;
  const sorted = evaluatedCandidates
    .filter((c) => (c.relevanceScore ?? 0) >= minRelevance)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

  await jobStore.update(jobId, {
    status: "complete",
    candidates: sorted,
    progress: {
      message: `Complete — ${sorted.length} candidates (${evaluatedCount} evaluated)`,
      found: refs.length,
      enriched: enrichedCount,
      evaluated: evaluatedCount,
    },
  });

  const rl = github.getRateLimit();
  console.log(`[search:${jobId}] Complete. Rate limit: ${rl.remaining}/${rl.limit}`);
}
