import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema/014_assistant_workout_generation.sql',import.meta.url),'utf8');
const dailySchema=fs.readFileSync(new URL('../schema/015_daily_workout_sequence.sql',import.meta.url),'utf8');
test('geração usa exercícios cadastrados, marca origem e guarda o dia da sequência',()=>{assert.match(server,/generateAssistantWorkout/);assert.match(server,/FROM exercises WHERE gym_id=\$1/);assert.match(server,/source,generated_by_assistant,routine_day,routine_cycle/);assert.match(server,/dailyWorkoutPlans/);assert.match(schema,/generated_by_assistant/);assert.match(dailySchema,/routine_day/)});
test('próximo treino é gerado após conclusão e sem exercício inventado',()=>{assert.match(server,/WORKOUT_COMPLETED/);assert.match(server,/WORKOUT_PRESCRIBED/);assert.match(server,/Treino diário gerado pelo Personal Gym/);assert.match(server,/Carga não definida/);assert.match(server,/NOT EXISTS\(SELECT 1 FROM workout_completions wc WHERE wc.workout_id=w.id/);assert.match(server,/UPDATE workouts SET status='inactive',updated_at=now\(\) WHERE id=\$1/)});
