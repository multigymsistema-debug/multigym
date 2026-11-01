import { askGroqNutrition, askGroqPersonal } from './groq.js';
import type { AssistantAgentId } from './assistantAgents.js';

/** Provider-neutral boundary used by the domain-specific assistant agents. */
export type AssistantProvider = {
  readonly id: string;
  respond(input: {
    agent: AssistantAgentId;
    message: string;
    context: unknown;
  }): Promise<string | null>;
};

/**
 * Groq remains the only active provider. This adapter preserves current model
 * selection, prompts, timeouts, safety guards, and null-on-failure behavior.
 * Replacing the model later requires an adapter change, not agent/data rewrites.
 */
export const groqAssistantProvider: AssistantProvider = Object.freeze({
  id: 'groq',
  async respond({ agent, message, context }) {
    if (agent === 'nutrigym') {
      return askGroqNutrition(message, context as any);
    }
    return askGroqPersonal(message, context as any);
  },
});

/** Active provider seam. A future provider can be selected here after validation. */
export async function askAssistantNutrition(message: string, context: unknown): Promise<string | null> {
  return groqAssistantProvider.respond({ agent: 'nutrigym', message, context });
}

export async function askAssistantPersonal(message: string, context: unknown): Promise<string | null> {
  return groqAssistantProvider.respond({ agent: 'personalgym', message, context });
}
