import "./env";

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

  // Quick Ollama check
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:12b";
  let ollamaAvailable = false;
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      const data = await r.json() as { models?: Array<{ name: string }> };
      ollamaAvailable = (data.models ?? []).some((m) => m.name === ollamaModel || m.name.startsWith(ollamaModel.split(":")[0]));
    }
  } catch { /* offline */ }

  res.json({
    status: "ok",
    github: { authenticated: !!process.env.GITHUB_TOKEN, rateLimit },
    ai: {
      primary: { provider: "ollama", model: ollamaModel, available: ollamaAvailable },
      fallback: { provider: "gemini-api", available: !!process.env.GEMINI_API_KEY },
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
