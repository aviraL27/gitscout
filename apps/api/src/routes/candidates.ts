import { Router, Request, Response } from "express";
import { GitHubClient } from "../github/GitHubClient";

export const candidatesRouter = Router();

const github = new GitHubClient();

// GET /api/candidates/:username — fetch a single candidate's raw GitHub data
candidatesRouter.get("/:username", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const [user, repos] = await Promise.all([
      github.getUser(username),
      github.getUserRepos(username, { perPage: 30 }),
    ]);
    res.json({ user, repos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      res.status(404).json({ error: "GitHub user not found" });
      return;
    }
    res.status(500).json({ error: message });
  }
});

// GET /api/candidates — stub for Phase 4 (list saved candidates from DB)
candidatesRouter.get("/", (_req: Request, res: Response) => {
  res.json({ candidates: [], message: "Candidate persistence coming in Phase 4" });
});
