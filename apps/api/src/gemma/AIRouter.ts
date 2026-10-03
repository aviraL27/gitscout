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

// ─── Gemma 4 API provider (Primary: fast, cloud-hosted Gemma 4) ───────────────

export class GemmaAPIProvider implements AIProvider {
  name = "gemma-4-api";

  // Official Gemma 4 on Google AI API
  private readonly model = "gemma-4-31b-it";
  private readonly fallbackModel = "gemini-2.5-flash";

  private get apiKey(): string {
    return process.env.GEMINI_API_KEY ?? "";
  }

  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) throw new Error("[GemmaAPIProvider] No GEMINI_API_KEY configured");

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Try official Gemma 4 models first, followed by Gemini 3.8 Flash fallback
    const modelsToTry = ["gemma-4-26b-a4b-it", "gemma-4-31b-it", "gemini-3.8-flash"];

    for (const targetModel of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
            }),
            signal: AbortSignal.timeout(35_000),
          }
        );

        if (!res.ok) {
          console.warn(`[GemmaAPI] Model ${targetModel} returned HTTP ${res.status}`);
          continue; // Try next model
        }

        const data = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string; thought?: boolean }>;
            };
          }>;
        };

        const parts = data.candidates?.[0]?.content?.parts ?? [];
        // Extract final text (ignoring internal thinking chain if present)
        const textPart = parts.find((p) => !p.thought && p.text) ?? parts[parts.length - 1];
        if (textPart?.text) {
          console.log(`[GemmaAPI] Successfully responded via ${targetModel}`);
          return textPart.text;
        }
      } catch (err: any) {
        console.warn(`[GemmaAPI] Request to ${targetModel} failed:`, err?.message ?? err);
      }
    }

    throw new Error("[GemmaAPIProvider] All cloud API models failed");
  }
}

// ─── Ollama provider (Local Gemma 4 fallback) ────────────────────────────────

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
        signal: AbortSignal.timeout(2000),
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
          temperature: 0.1,
          num_predict: 1024,
        },
        think: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      throw new Error(`[Ollama] HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { message?: { content: string }; error?: string };
    if (data.error) throw new Error(`[Ollama] ${data.error}`);
    return data.message?.content ?? "";
  }
}

// ─── AI Router: Gemma 4 API first, local Ollama fallback ─────────────────────

export class AIRouter {
  private readonly gemmaAPI = new GemmaAPIProvider();
  private readonly ollama = new OllamaProvider();

  async chat(prompt: string, systemPrompt?: string): Promise<{ text: string; provider: string }> {
    // 1. Try Gemma 4 API (Fast cloud inference)
    try {
      const text = await this.gemmaAPI.chat(prompt, systemPrompt);
      return { text, provider: this.gemmaAPI.name };
    } catch (err) {
      console.warn(`[AIRouter] Gemma 4 API error, checking local Ollama fallback:`, err);
    }

    // 2. Fallback to Local Ollama if API is unavailable
    if (await this.ollama.isAvailable()) {
      try {
        const text = await this.ollama.chat(prompt, systemPrompt);
        return { text, provider: this.ollama.name };
      } catch (err) {
        console.warn(`[AIRouter] Local Ollama fallback also failed:`, err);
      }
    }

    throw new Error("[AIRouter] No AI evaluation provider available");
  }
}

// Singleton
export const aiRouter = new AIRouter();
