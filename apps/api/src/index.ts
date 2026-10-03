import "./env";

import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search";
import { candidatesRouter } from "./routes/candidates";
import { emailRouter } from "./routes/email";
import { GitHubClient } from "./github/GitHubClient";
import { emailService } from "./email/EmailService";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/search", searchRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/email", emailRouter);

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
      primary: { provider: "gemma-4-api", model: "gemma-4-31b-it", available: !!process.env.GEMINI_API_KEY },
      fallback: { provider: "ollama-local", model: ollamaModel, available: ollamaAvailable },
    },
    email: {
      provider: "gmail-smtp",
      configured: emailService.isConfigured(),
      senderEmail: emailService.getSenderEmail(),
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
  console.log(`   Gmail SMTP:   ${emailService.isConfigured() ? `✅ configured (${emailService.getSenderEmail()})` : "❌ not configured"}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
