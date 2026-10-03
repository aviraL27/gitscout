import path from "path";
import dotenv from "dotenv";
// Load .env from repo root first, then fall back to local
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // local .env fallback

import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search";
import { candidatesRouter } from "./routes/candidates";
import { GitHubClient } from "./github/GitHubClient";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/search", searchRouter);
app.use("/api/candidates", candidatesRouter);

// ─── Health + rate-limit info ─────────────────────────────────────────────────

app.get("/api/health", async (_req, res) => {
  const github = new GitHubClient();
  let rateLimit = null;
  try {
    rateLimit = await github.fetchRateLimit();
  } catch {
    rateLimit = github.getRateLimit();
  }
  res.json({
    status: "ok",
    github: {
      authenticated: !!process.env.GITHUB_TOKEN,
      rateLimit,
    },
  });
});

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 GitScout API running on http://localhost:${PORT}`);
  console.log(`   GitHub token: ${process.env.GITHUB_TOKEN ? "✅ configured" : "⚠️  not set (60 req/hr limit)"}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
