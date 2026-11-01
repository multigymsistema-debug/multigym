import test from 'node:test';
import assert from 'node:assert/strict';
import {nutritionFallback,personalFallback} from '../dist/assistantFallback.js';

test('fallback NutriGym sumariza somente registros do dia e distingue estimativas',()=>{
  const text=nutritionFallback({student:{full_name:'Ana Silva'},profile:{water_goal_ml:2000},intent:'DAILY_SUMMARY',nutrition:{today:'2026-11-01',meals:[{},{}],totals_today:{calories:820,protein_g:42},hydration:[{hydration_date:'2026-11-01',amount_ml:500},{hydration_date:'2026-10-31',amount_ml:900}]}});
  assert.match(text,/2 refeição/);assert.match(text,/820 kcal/);assert.match(text,/500 ml/);assert.doesNotMatch(text,/1400 ml/);assert.match(text,/estimados|estimativa|estimados/i);
});

test('fallback de recomendação não escolhe alimento quando há alergia ou restrição',()=>{
  const text=nutritionFallback({student:{full_name:'Ana'},profile:{allergies:'amendoim'},intent:'RECOMMENDATION'});
  assert.match(text,/não vou sugerir um alimento específico/);
});

test('fallback Personal Gym explica exercício apenas com instrução cadastrada',()=>{
  const text=personalFallback({student:{full_name:'João Silva'},intent:'EXERCISE_TECHNIQUE',question:'Como fazer supino?',training:{active_workouts:[{name:'A',exercises:[{name:'Supino reto',instructions:'Ajuste o banco e mantenha controle.'}]}]}});
  assert.match(text,/Ajuste o banco/);assert.match(text,/Supino reto/);
});

test('fallback de evolução não chama treino prescrito de desempenho',()=>{
  const empty=personalFallback({intent:'TRAINING_PROGRESS',training:{logs:[],history:[]}});
  assert.match(empty,/ainda não há registros/);
  const withLogs=personalFallback({intent:'TRAINING_PROGRESS',training:{logs:[{exercise_name:'Supino',weight:20,reps:10},{exercise_name:'Supino',weight:22,reps:9}]}});
  assert.match(withLogs,/Supino/);assert.match(withLogs,/podem conter valores preenchidos automaticamente/);
});
