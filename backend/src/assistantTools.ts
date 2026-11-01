import { z } from 'zod';
import { getAssistantAgentProfile, type AssistantAgentId } from './assistantAgents.js';

export type AssistantToolId =
  | 'read_student_training_profile'
  | 'read_active_workout_catalog'
  | 'read_active_exercise_catalog'
  | 'read_workout_history'
  | 'read_confirmed_workout_performance'
  | 'read_assessments'
  | 'read_student_nutrition_profile'
  | 'read_nutrition_goals'
  | 'read_confirmed_meals'
  | 'read_confirmed_hydration'
  | 'read_food_composition'
  | 'read_weight_history'
  | 'read_hydration_records';

export type AssistantToolResult = {
  tool: AssistantToolId;
  status: 'ok' | 'unavailable';
  source: string;
  asOf: string;
  recordCount: number;
  data: unknown;
  limitation?: string;
};

const emptyArgs = z.object({}).strict();
const result = (tool: AssistantToolId, source: string, data: unknown, limitation?: string): AssistantToolResult => ({
  tool, status: data === null || data === undefined ? 'unavailable' : 'ok', source,
  asOf: new Date().toISOString(), recordCount: Array.isArray(data) ? data.length : data == null ? 0 : 1,
  data: data ?? null, ...(limitation ? { limitation } : {}),
});

/** Read-only tools consume server-fetched, already tenant/student-scoped records. */
export function executeAssistantTool(agent: AssistantAgentId, tool: AssistantToolId, args: unknown, scopedData: Record<string, any>): AssistantToolResult {
  emptyArgs.parse(args ?? {});
  if (!getAssistantAgentProfile(agent).toolAllowlist.includes(tool)) throw new Error('TOOL_NOT_ALLOWED');
  const data = scopedData || {};
  switch (tool) {
    case 'read_student_training_profile':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'students + nutrigym_profiles', { student: data.student ?? null, profile: data.profile ?? null }, !data.student ? 'Perfil não encontrado.' : undefined);
    case 'read_student_nutrition_profile':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'students + nutrigym_profiles', { student: data.student ?? null, profile: data.profile ?? null }, !data.profile ? 'Perfil nutricional não encontrado.' : undefined);
    case 'read_active_workout_catalog':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'workouts + workout_exercises + exercises', data.workouts ?? [], Array.isArray(data.workouts) && data.workouts.length === 0 ? 'Nenhum treino ativo encontrado.' : undefined);
    case 'read_workout_history':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'workout_completions + workouts', data.workoutHistory ?? [], Array.isArray(data.workoutHistory) && data.workoutHistory.length === 0 ? 'Nenhum treino concluído encontrado.' : undefined);
    case 'read_active_exercise_catalog':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'exercises', data.exerciseCatalog ?? [], Array.isArray(data.exerciseCatalog) && data.exerciseCatalog.length === 0 ? 'Nenhum exercício ativo disponível.' : undefined);
    case 'read_confirmed_workout_performance':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'workout_logs + workout_completions', data.logs ?? [], Array.isArray(data.logs) && data.logs.length === 0 ? 'Não há séries executadas e confirmadas disponíveis.' : undefined);
    case 'read_assessments':
      if (agent !== 'personalgym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'assessments', data.assessments ?? [], Array.isArray(data.assessments) && data.assessments.length === 0 ? 'Nenhuma avaliação física disponível.' : undefined);
    case 'read_confirmed_meals':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'nutrigym_meals', data.meals ?? [], Array.isArray(data.meals) && data.meals.length === 0 ? 'Nenhuma refeição registrada no período disponível.' : undefined);
    case 'read_nutrition_goals':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'nutrigym_goals + nutrigym_profiles', { goals: data.goals ?? [], profileTargets: data.profileTargets ?? null }, Array.isArray(data.goals) && data.goals.length === 0 && !data.profileTargets ? 'Nenhuma meta registrada.' : undefined);
    case 'read_food_composition':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      if (!Array.isArray(data.foodComposition)) return { tool, status: 'unavailable', source: 'MultiGym food composition catalogue', asOf: new Date().toISOString(), recordCount: 0, data: null, limitation: 'O MultiGym ainda não tem um catálogo estruturado de composição de alimentos conectado; não vou estimar a partir de uma fonte inexistente.' };
      return result(tool, 'MultiGym food composition catalogue', data.foodComposition, data.foodComposition.length === 0 ? 'Nenhum alimento correspondeu à consulta no catálogo disponível.' : undefined);
    case 'read_weight_history':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'nutrigym_checkins + assessments', data.weightHistory ?? [], Array.isArray(data.weightHistory) && data.weightHistory.length === 0 ? 'Nenhum registro de peso disponível.' : undefined);
    case 'read_confirmed_hydration':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'nutrigym_hydration', data.hydration ?? [], Array.isArray(data.hydration) && data.hydration.length === 0 ? 'Nenhum registro de hidratação disponível.' : undefined);
    case 'read_hydration_records':
      if (agent !== 'nutrigym') throw new Error('TOOL_NOT_ALLOWED');
      return result(tool, 'nutrigym_hydration', data.hydration ?? [], Array.isArray(data.hydration) && data.hydration.length === 0 ? 'Nenhum registro de hidratação disponível.' : undefined);
  }
}

export function runAssistantTools(agent: AssistantAgentId, message: string, scopedData: Record<string, any>): AssistantToolResult[] {
  return selectAssistantTools(agent, message).map(tool => {
    try {
      return executeAssistantTool(agent, tool, {}, scopedData);
    } catch {
      return { tool, status: 'unavailable', source: 'MultiGym backend', asOf: new Date().toISOString(), recordCount: 0, data: null, limitation: 'A consulta não pôde ser concluída; nenhum resultado foi presumido.' };
    }
  });
}

const matches = (message: string, expression: RegExp) => expression.test(message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());

/** Conservative local planner: Groq is text-only, so the backend selects tools. */
export function selectAssistantTools(agent: AssistantAgentId, message: string): AssistantToolId[] {
  const selected = new Set<AssistantToolId>();
  if (agent === 'personalgym') {
    if (matches(message, /perfil|objetiv|limitac|restric|preferenc|experienc|idade/)) selected.add('read_student_training_profile');
    if (matches(message, /treino|exercicio|exercicios|muscul|supino|peito|costas|perna|ombro|braco|biceps|triceps/)) selected.add('read_active_workout_catalog');
    if (matches(message, /exercicio|exercicios|disponiveis|catalogo/)) selected.add('read_active_exercise_catalog');
    if (matches(message, /exercicio|exercicios|catalogo/)) selected.add('read_confirmed_workout_performance');
    if (matches(message, /ultimo|ultimos|historico|treino anterior|treinos concluidos|treinei/)) selected.add('read_workout_history');
    if (matches(message, /ultimo|ultimos|historico|carga|evolu|desempenho|serie|repet|aument|diminu|treinei|treino de/)) selected.add('read_confirmed_workout_performance');
    if (matches(message, /avaliac|medida|composicao corporal|percentual de gordura/)) selected.add('read_assessments');
  } else {
    if (matches(message, /perfil|objetiv|alerg|restric|preferenc|meta|caloria|proteina|carboidrato|gordura/)) selected.add('read_student_nutrition_profile');
    if (matches(message, /meta|objetiv|caloria|proteina|carboidrato|gordura|quanto devo/)) selected.add('read_nutrition_goals');
    if (matches(message, /refeic|aliment|comi|comer|almoco|almocar|jantar|lanche|semana|registr|proteina/)) selected.add('read_confirmed_meals');
    if (matches(message, /alimento|composicao|nutriente|caloria de|macro/)) selected.add('read_food_composition');
    if (matches(message, /peso|emagrec|engord|evolucao|historico/)) selected.add('read_weight_history');
    if (matches(message, /hidrat|agua|ml|litro/)) { selected.add('read_confirmed_hydration'); selected.add('read_hydration_records'); }
  }
  return [...selected].filter(tool => getAssistantAgentProfile(agent).toolAllowlist.includes(tool));
}
