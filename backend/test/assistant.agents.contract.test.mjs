import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const agents = fs.readFileSync(new URL('../src/assistantAgents.ts', import.meta.url), 'utf8');
const provider = fs.readFileSync(new URL('../src/assistantProvider.ts', import.meta.url), 'utf8');
const groq = fs.readFileSync(new URL('../src/groq.ts', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');

test('Personal Gym and Nutri Gym have separate domain resources and allowlists', () => {
  for (const key of ['personalgym-training', 'personalgym-quality-safety', 'personalgym-safety-v1', 'read_confirmed_workout_performance']) assert.ok(agents.includes(key), `missing ${key}`);
  for (const key of ['nutrigym-nutrition', 'nutrigym-quality-safety', 'nutrigym-safety-v1', 'read_food_composition']) assert.ok(agents.includes(key), `missing ${key}`);
  assert.match(agents, /Object\.freeze\(\{[\s\S]*personalgym:[\s\S]*nutrigym:/);
});

test('provider seam keeps Groq active and preserves current domain-specific functions', () => {
  assert.match(provider, /id: 'groq'/);
  assert.match(provider, /askGroqNutrition\(message, context as any\)/);
  assert.match(provider, /askGroqPersonal\(message, context as any\)/);
  assert.match(groq, /export async function askGroqNutrition/);
  assert.match(groq, /export async function askGroqPersonal/);
  assert.match(groq, /if\(!key\)return null/);
});

test('existing assistant routes retain deterministic fallback paths and scoped student auth', () => {
  assert.match(server, /app\.post\('\/student-api\/personalgym\/assistant',\{preHandler:studentAuth\}/);
  assert.match(server, /app\.post\('\/student-api\/nutrigym\/assistant',\{preHandler:studentAuth\}/);
  assert.match(server, /if\(!text\)text=personalFallback\(context\)/);
  assert.match(server, /const safeFallback=intent==='SAFETY'/);
  assert.match(server, /const text=ai\|\|safeFallback/);
});
