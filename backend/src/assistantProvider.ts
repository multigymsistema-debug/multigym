import { askGroqNutrition, askGroqPersonal } from './groq.js';
import type { AssistantAgentId } from './assistantAgents.js';

export type AssistantJsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

/** Provider-neutral request: no database handle, credentials, or student ID. */
export type AssistantInferenceRequest = {
  agent: AssistantAgentId;
  message: string;
  context: Readonly<Record<string, unknown>>;
  responseFormat?: { type: 'text' } | { type: 'json_schema'; jsonSchema: AssistantJsonSchema };
  parameters?: {
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
  };
};

/** Normalized provider result; optional measurements stay absent if unavailable. */
export type AssistantInferenceResult = {
  text: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  finishReason?: string;
};

export interface AssistantProvider {
  readonly id: string;
  readonly capabilities: Readonly<{ structuredOutput: boolean; toolCalling: boolean; vision: boolean }>;
  infer(request: AssistantInferenceRequest): Promise<AssistantInferenceResult | null>;
}

/**
 * Compatibility adapter for today's reviewed legacy Groq calls. It intentionally
 * supports text only: structured output and tools are not silently faked. The
 * legacy prompts, safety checks, timeout and null-on-error behavior stay intact.
 */
export const groqAssistantProvider: AssistantProvider = Object.freeze({
  id: 'groq',
  capabilities: Object.freeze({ structuredOutput: false, toolCalling: false, vision: false }),
  async infer(request: AssistantInferenceRequest) {
    const { agent, message, context, responseFormat } = request;
    if (responseFormat && responseFormat.type !== 'text') return null;
    const text = agent === 'nutrigym'
      ? await askGroqNutrition(message, context as any)
      : await askGroqPersonal(message, context as any);
    if (!text) return null;
    return {
      text,
      provider: 'groq',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    };
  },
});

export type AssistantProviderRouter = {
  readonly providerId: string;
  infer(request: AssistantInferenceRequest): Promise<AssistantInferenceResult | null>;
};

/** Creates a testable provider boundary and rejects missing/duplicate adapters. */
export function createAssistantProviderRouter(
  providers: readonly AssistantProvider[],
  providerId: string,
): AssistantProviderRouter {
  const matches = providers.filter(provider => provider.id === providerId);
  if (matches.length !== 1) throw new Error(`Assistant provider is not uniquely configured: ${providerId}`);
  const provider = matches[0];
  return Object.freeze({
    providerId,
    async infer(request: AssistantInferenceRequest) {
      if (request.responseFormat?.type === 'json_schema' && !provider.capabilities.structuredOutput) return null;
      try {
        const result = await provider.infer(request);
        if (!result || typeof result.text !== 'string' || !result.text.trim()) return null;
        return { ...result, provider: provider.id };
      } catch {
        // Provider outages and adapter failures use the same safe fallback path.
        return null;
      }
    },
  });
}

const configuredProviderId = process.env.ASSISTANT_PROVIDER_ID || 'groq';
const activeRouter = createAssistantProviderRouter([groqAssistantProvider], configuredProviderId);

async function askAgent(agent: AssistantAgentId, message: string, context: unknown): Promise<string | null> {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  const result = await activeRouter.infer({ agent, message, context: context as Readonly<Record<string, unknown>>, responseFormat: { type: 'text' } });
  return result?.text ?? null;
}

/** Existing route-facing functions remain compatible during staged migration. */
export function askAssistantNutrition(message: string, context: unknown): Promise<string | null> {
  return askAgent('nutrigym', message, context);
}

export function askAssistantPersonal(message: string, context: unknown): Promise<string | null> {
  return askAgent('personalgym', message, context);
}
