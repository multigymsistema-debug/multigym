import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const agents = fs.readFileSync(new URL('../src/assistantAgents.ts', import.meta.url), 'utf8');
const providerSource = fs.readFileSync(new URL('../src/assistantProvider.ts', import.meta.url), 'utf8');
const groqSource = fs.readFileSync(new URL('../src/groq.ts', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
const { ASSISTANT_AGENTS, getAssistantAgentProfile } = await import('../dist/assistantAgents.js');
const { createAssistantProviderRouter } = await import('../dist/assistantProvider.js');

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
  assert.ok(nutrition.toolAllowlist.includes('read_food_composition'));
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
  assert.match(server, /const safeFallback=intent==='SAFETY'/);
  assert.match(server, /const text=ai\|\|safeFallback/);
});
