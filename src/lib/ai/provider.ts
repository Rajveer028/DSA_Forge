import { serverEnv } from "@/lib/env";

/**
 * AI provider abstraction.
 *
 * The rest of the app only ever talks to `AIProvider`. Swapping vendors is an
 * environment change (AI_PROVIDER / AI_MODEL / AI_BASE_URL / AI_API_KEY), not a
 * code change. Keys are read server-side and never leave this module.
 */

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** When set, the provider is asked to emit a single JSON object. */
  json?: boolean;
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export class AIUnavailableError extends Error {
  status = 503;
  constructor(message = "AI features are not configured. Set AI_API_KEY in the server environment.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export class AIRequestError extends Error {
  status = 502;
  constructor(message: string, public readonly detail?: string) {
    super(message);
    this.name = "AIRequestError";
  }
}

const JSON_NUDGE =
  "\n\nRespond with a single valid JSON object and nothing else. Do not wrap it in markdown fences.";

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new AIRequestError(
        `AI provider responded with ${response.status}.`,
        text.slice(0, 500),
      );
    }
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AIRequestError) throw error;
    if ((error as Error)?.name === "AbortError") {
      throw new AIRequestError("The AI request timed out. Please try again.");
    }
    throw new AIRequestError("Could not reach the AI provider.", (error as Error).message);
  } finally {
    clearTimeout(timeout);
  }
}

/** Anthropic Messages API. */
class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.anthropic.com",
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const data = await postJson(
      `${this.baseUrl}/v1/messages`,
      {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      {
        model: this.model,
        max_tokens: request.maxTokens ?? serverEnv.aiMaxTokens,
        temperature: request.temperature ?? 0.4,
        system: request.system + (request.json ? JSON_NUDGE : ""),
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      },
    );
    const blocks = (data.content ?? []) as Array<{ type: string; text?: string }>;
    const text = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return { text, model: this.model, provider: this.name };
  }
}

/** OpenAI-compatible Chat Completions (OpenAI, Groq, Together, Ollama, …). */
class OpenAICompatibleProvider implements AIProvider {
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const data = await postJson(
      `${this.baseUrl}/chat/completions`,
      { authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        max_tokens: request.maxTokens ?? serverEnv.aiMaxTokens,
        temperature: request.temperature ?? 0.4,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: request.system + (request.json ? JSON_NUDGE : "") },
          ...request.messages,
        ],
      },
    );
    const choices = (data.choices ?? []) as Array<{ message?: { content?: string } }>;
    return {
      text: (choices[0]?.message?.content ?? "").trim(),
      model: this.model,
      provider: this.name,
    };
  }
}

let cached: AIProvider | null = null;

/** Returns the configured provider, or null when AI is not set up. */
export function getAIProvider(): AIProvider | null {
  if (cached) return cached;
  const apiKey = serverEnv.aiApiKey;
  if (!apiKey) return null;

  const model = serverEnv.aiModel;
  switch (serverEnv.aiProvider) {
    case "anthropic":
      cached = new AnthropicProvider(model, apiKey, serverEnv.aiBaseUrl);
      break;
    case "openai":
      cached = new OpenAICompatibleProvider(
        "openai",
        model,
        apiKey,
        serverEnv.aiBaseUrl ?? "https://api.openai.com/v1",
      );
      break;
    default:
      // Any OpenAI-compatible gateway: AI_PROVIDER=<name> + AI_BASE_URL=<url>
      if (!serverEnv.aiBaseUrl) return null;
      cached = new OpenAICompatibleProvider(
        serverEnv.aiProvider,
        model,
        apiKey,
        serverEnv.aiBaseUrl,
      );
  }
  return cached;
}

export function requireAIProvider(): AIProvider {
  const provider = getAIProvider();
  if (!provider) throw new AIUnavailableError();
  return provider;
}

export function isAIConfigured() {
  return getAIProvider() !== null;
}

/** Tolerant JSON extraction — models occasionally wrap output in prose/fences. */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new AIRequestError("The AI response was not valid JSON.", raw.slice(0, 400));
  }
}
