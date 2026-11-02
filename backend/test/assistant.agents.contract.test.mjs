import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const agents = fs.readFileSync(new URL('../src/assistantAgents.ts', import.meta.url), 'utf8');
const providerSource = fs.readFileSync(new URL('../src/assistantProvider.ts', import.meta.url), 'utf8');
const groqSource = fs.readFileSync(new URL('../src/groq.ts', import.meta.url), 'utf8');
const toolsSource = fs.readFileSync(new URL('../src/assistantTools.ts', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
const { ASSISTANT_AGENTS, getAssistantAgentProfile } = await import('../dist/assistantAgents.js');
const { createAssistantProviderRouter } = await import('../dist/assistantProvider.js');
const { selectAssistantTools, executeAssistantTool, runAssistantTools } = await import('../dist/assistantTools.js');

test('agent profiles are immutable and domain-specific', () => {
  const personal = getAssistantAgentProfile('personalgym');
  const nutrition = getAssistantAgentProfile('nutrigym');
  assert.ok(Object.isFrozen(ASSISTANT_AGENTS));
  assert.ok(Object.isFrozen(personal));
  assert.ok(Object.isFrozen(personal.toolAllowlist));
  assert.notEqual(personal.knowledgeCollection, nutrition.knowledgeCollection);
  assert.notEqual(personal.evaluationSuite, nutrition.evaluationSuite);
  assert.notEqual(personal.safetyPolicy, nutrition.safetyPolicy);
  assert.deepEqual(personal.toolAllowlist.filter(tool => nutrition.toolAllowlist.includes(tool)), []);
  assert.ok(personal.toolAllowlist.includes('read_confirmed_workout_performance'));
  assert.ok(personal.toolAllowlist.includes('read_workout_history'));
  assert.ok(personal.toolAllowlist.includes('read_active_exercise_catalog'));
  assert.ok(nutrition.toolAllowlist.includes('read_confirmed_hydration'));
  assert.ok(nutrition.toolAllowlist.includes('read_food_composition'));
  assert.ok(nutrition.toolAllowlist.includes('read_nutrition_goals'));
});

test('tool planner selects read-only domain tools and rejects model-selected IDs', () => {
  assert.deepEqual(selectAssistantTools('personalgym','Como foi meu último treino de peito?').sort(), ['read_active_workout_catalog','read_confirmed_workout_performance','read_workout_history'].sort());
  assert.ok(selectAssistantTools('nutrigym','Como está minha alimentação esta semana e minha proteína?').includes('read_confirmed_meals'));
  assert.ok(selectAssistantTools('nutrigym','Quanto de água bebi?').includes('read_confirmed_hydration'));
  assert.ok(selectAssistantTools('nutrigym','Quanto de água bebi?').includes('read_hydration_records'));
  assert.ok(selectAssistantTools('nutrigym','Qual minha meta de proteína?').includes('read_nutrition_goals'));
  assert.throws(() => executeAssistantTool('personalgym','read_confirmed_meals',{},{}), /TOOL_NOT_ALLOWED/);
  assert.throws(() => executeAssistantTool('personalgym','read_confirmed_workout_performance',{student_id:'other'},{}), /Unrecognized key/);
  const unavailable=runAssistantTools('nutrigym','Quais calorias há nos alimentos?',{});
  assert.ok(unavailable.some(result=>result.tool==='read_food_composition'&&result.status==='unavailable'&&result.recordCount===0));
  assert.match(unavailable.find(result=>result.tool==='read_food_composition').limitation,/não tem um catálogo estruturado/);
  assert.match(toolsSource,/already tenant\/student-scoped/);
  assert.match(toolsSource,/emptyArgs\.parse\(args \?\? \{\}\)/);
  assert.match(toolsSource,/z\.object\(\{\}\)\.strict\(\)/);
});

test('provider router dispatches unchanged agent, context and request format', async () => {
  const calls = [];
  const provider = {
    id: 'test-provider',
    capabilities: { structuredOutput: true, toolCalling: false, vision: false },
    async infer(request) { calls.push(request); return { text: 'ok', provider: 'ignored', model: 'fake-model' }; },
  };
  const router = createAssistantProviderRouter([provider], 'test-provider');
  const request = { agent: 'personalgym', message: 'Resumo do meu treino', context: { logs: [{ confirmed: true }] }, responseFormat: { type: 'text' } };
  const result = await router.infer(request);
  assert.deepEqual(calls, [request]);
  assert.deepEqual(result, { text: 'ok', provider: 'test-provider', model: 'fake-model' });
});

test('provider router fails closed on missing or duplicate providers', () => {
  const provider = { id: 'x', capabilities: {}, async infer() { return null; } };
  assert.throws(() => createAssistantProviderRouter([], 'x'), /not uniquely configured/);
  assert.throws(() => createAssistantProviderRouter([provider, provider], 'x'), /not uniquely configured/);
});

test('provider router normalizes exceptions, empty responses and unsupported structured output to fallback', async () => {
  const base = { id: 'text-only', capabilities: { structuredOutput: false, toolCalling: false, vision: false } };
  const errorRouter = createAssistantProviderRouter([{ ...base, async infer() { throw new Error('secret provider error'); } }], 'text-only');
  const emptyRouter = createAssistantProviderRouter([{ ...base, async infer() { return { text: '   ', model: 'm' }; } }], 'text-only');
  const structuredRouter = createAssistantProviderRouter([{ ...base, async infer() { throw new Error('must not be called'); } }], 'text-only');
  const common = { agent: 'nutrigym', message: 'oi', context: {} };
  assert.equal(await errorRouter.infer(common), null);
  assert.equal(await emptyRouter.infer(common), null);
  assert.equal(await structuredRouter.infer({ ...common, responseFormat: { type: 'json_schema', jsonSchema: { name: 'meal', schema: { type: 'object' } } } }), null);
});

test('legacy Groq functions remain behind the adapter; routes retain auth and fallback behavior', () => {
  assert.match(providerSource, /askGroqNutrition\(message, context as any\)/);
  assert.match(providerSource, /askGroqPersonal\(message, context as any\)/);
  assert.match(groqSource, /export async function askGroqNutrition/);
  assert.match(groqSource, /export async function askGroqPersonal/);
  assert.match(providerSource, /process\.env\.ASSISTANT_PROVIDER_ID \|\| 'groq'/);
  assert.match(server, /app\.post\('\/student-api\/personalgym\/assistant',\{preHandler:studentAuth\}/);
  assert.match(server, /app\.post\('\/student-api\/nutrigym\/assistant',\{preHandler:studentAuth\}/);
  assert.match(server, /if\(!text\)text=personalFallback\(context\)/);
  assert.match(server, /runAssistantTools\('personalgym',message/);
  assert.match(server, /runAssistantTools\('nutrigym',message/);
  assert.match(server, /if\(intent==='SAFETY'\)return/);
  assert.match(server, /const text=ai\|\|safeFallback/);
  assert.match(server,/retrieveRelevantMemory\(s\.gym,s\.student,'nutrigym',message,rawContext\)/);
  assert.match(server,/retrieveRelevantMemory\(s\.gym,s\.student,'personalgym',message,rawContext\)/);
  assert.match(server,/retrieveKnowledge\('nutrigym',message\)/);
  assert.match(server,/retrieveKnowledge\('personalgym',message\)/);
});
