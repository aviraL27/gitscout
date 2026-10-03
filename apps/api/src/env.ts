import path from "path";
import dotenv from "dotenv";

// Load .env from root first, then fallback to local
const rootEnv = path.resolve(__dirname, "../../../.env");
const localEnv = path.resolve(__dirname, "../.env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });

console.log("[env] Loaded environment:", {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "✅ set" : "❌ not set",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "✅ set" : "❌ not set",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "gemma4:12b",
  GMAIL_SMTP: process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? `✅ configured (${process.env.GMAIL_USER})` : "❌ not set",
});
