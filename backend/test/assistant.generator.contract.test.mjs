import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema/014_assistant_workout_generation.sql',import.meta.url),'utf8');
test('geração usa exercícios cadastrados e marca origem',()=>{assert.match(server,/generateAssistantWorkout/);assert.match(server,/FROM exercises WHERE gym_id=\$1/);assert.match(server,/source,generated_by_assistant\).*'assistant',true/);assert.match(schema,/generated_by_assistant/)});
test('próximo treino gerado só após conclusão e sem exercício inventado',()=>{assert.match(server,/WORKOUT_COMPLETED/);assert.match(server,/WORKOUT_PRESCRIBED/);assert.match(server,/Treino gerado pelo Personal Gym/);assert.match(server,/Carga não definida/)});
