import { z } from "zod";

// ─── Evaluation output schema ─────────────────────────────────────────────────

export const EvaluationSchema = z.object({
  relevant: z.boolean(),
  score: z.number().int().min(0).max(100),
  reason: z.string(),
  matchingSkills: z.array(z.string()),
  evidence: z.array(z.string()),
  signals: z.object({
    locationMatch: z.boolean(),
    skillMatch: z.boolean(),
    languageMatch: z.boolean(),
    repositoryEvidence: z.boolean(),
    recentActivity: z.boolean(),
  }),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

// ─── Outreach output schema ────────────────────────────────────────────────────

export const OutreachSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type Outreach = z.infer<typeof OutreachSchema>;

// ─── AI provider interface ────────────────────────────────────────────────────

export interface AIProvider {
  name: string;
  chat(prompt: string, systemPrompt?: string): Promise<string>;
}

// ─── Ollama provider (local, primary) ────────────────────────────────────────

export class OllamaProvider implements AIProvider {
  name = "ollama-local";

  private get baseUrl(): string {
    return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  }

  private get model(): string {
    return process.env.OLLAMA_MODEL ?? "gemma4:12b";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models ?? [];
      return models.some((m) => m.name === this.model || m.name.startsWith(this.model.split(":")[0]));
    } catch {
      return false;
    }
  }

  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: 0.1,  // Low temperature for structured JSON output
          num_predict: 1024,
        },
        think: false,
      }),
      signal: AbortSignal.timeout(120_000), // 2 min timeout for local inference
    });

    if (!res.ok) {
      throw new Error(`[Ollama] HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { message?: { content: string }; error?: string };
    if (data.error) throw new Error(`[Ollama] ${data.error}`);
    return data.message?.content ?? "";
  }
}

// ─── Gemini API provider (fallback) ──────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  name = "gemini-api";

  private readonly model = "gemma-3-27b-it"; // Gemma model via Gemini API

  private get apiKey(): string {
    return process.env.GEMINI_API_KEY ?? "";
  }


  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) throw new Error("[GeminiProvider] No API key configured");

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) {
      throw new Error(`[GeminiAPI] HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

// ─── AI Router: Ollama-first, Gemini fallback ─────────────────────────────────

export class AIRouter {
  private readonly ollama = new OllamaProvider();
  private readonly gemini = new GeminiProvider();

  private ollamaAvailable: boolean | null = null; // cached after first check

  async chat(prompt: string, systemPrompt?: string): Promise<{ text: string; provider: string }> {
    // Check Ollama availability (cache result for 60s — reset on error)
    if (this.ollamaAvailable === null) {
      this.ollamaAvailable = await this.ollama.isAvailable();
      console.log(`[AIRouter] Ollama available: ${this.ollamaAvailable} (model: ${this.ollama.name})`);
    }

    if (this.ollamaAvailable) {
      try {
        const text = await this.ollama.chat(prompt, systemPrompt);
        return { text, provider: this.ollama.name };
      } catch (err) {
        console.warn(`[AIRouter] Ollama failed, falling back to Gemini: ${err}`);
        this.ollamaAvailable = false; // Don't retry Ollama for this session
      }
    }

    // Fallback to Gemini API
    const text = await this.gemini.chat(prompt, systemPrompt);
    return { text, provider: this.gemini.name };
  }

  resetCache(): void {
    this.ollamaAvailable = null;
  }
}

// Singleton
export const aiRouter = new AIRouter();
