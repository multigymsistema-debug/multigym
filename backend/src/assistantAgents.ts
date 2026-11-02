/**
 * Stable domain contracts for the two independent MultiGym assistants.
 * These profiles describe each agent's boundary; prompts and data access stay
 * in their existing reviewed modules until migrated deliberately.
 */
export type AssistantAgentId = 'personalgym' | 'nutrigym';

export type AssistantAgentProfile = {
  id: AssistantAgentId;
  displayName: 'Personal Gym' | 'Nutri Gym';
  knowledgeCollection: string;
  evaluationSuite: string;
  safetyPolicy: string;
  toolAllowlist: readonly string[];
};

export const ASSISTANT_AGENTS: Readonly<Record<AssistantAgentId, AssistantAgentProfile>> = Object.freeze({
  personalgym: Object.freeze({
    id: 'personalgym',
    displayName: 'Personal Gym',
    knowledgeCollection: 'personalgym-training',
    evaluationSuite: 'personalgym-quality-safety',
    safetyPolicy: 'personalgym-safety-v1',
    toolAllowlist: Object.freeze([
      'read_student_training_profile',
      'read_active_workout_catalog',
      'read_active_exercise_catalog',
      'read_workout_history',
      'read_confirmed_workout_performance',
      'read_assessments',
    ]),
  }),
  nutrigym: Object.freeze({
    id: 'nutrigym',
    displayName: 'Nutri Gym',
    knowledgeCollection: 'nutrigym-nutrition',
    evaluationSuite: 'nutrigym-quality-safety',
    safetyPolicy: 'nutrigym-safety-v1',
    toolAllowlist: Object.freeze([
      'read_student_nutrition_profile',
      'read_food_composition',
      'read_confirmed_meals',
      'read_confirmed_hydration',
      'read_weight_history',
      'read_hydration_records',
      'read_nutrition_goals',
    ]),
  }),
});

export function getAssistantAgentProfile(agent: AssistantAgentId): AssistantAgentProfile {
  return ASSISTANT_AGENTS[agent];
}
