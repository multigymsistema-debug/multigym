import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findRestrictedFoodMentions} from '../dist/assistantSafety.js';
import {detectAssistantIntent,buildNutriContext,buildPersonalContext} from '../dist/assistantContext.js';

const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const groq=fs.readFileSync(new URL('../src/groq.ts',import.meta.url),'utf8');

test('detecta sintomas urgentes mesmo misturados a uma saudação ou pedido comum',()=>{
  assert.equal(detectAssistantIntent('Oi, estou tonto e com falta de ar','personal'),'SAFETY');
  assert.equal(detectAssistantIntent('Bom dia, tive uma reação alérgica','nutrition'),'SAFETY');
  assert.equal(detectAssistantIntent('Desmaiei depois do exercício','personal'),'SAFETY');
});

test('guarda lexical bloqueia alergênico em frase de recomendação e mantém preferências como preferências',()=>{
  assert.deepEqual(findRestrictedFoodMentions('Você pode comer pão com pasta de amendoim.',{allergies:'amendoim',restrictions:''}),['amendoim']);
  assert.deepEqual(findRestrictedFoodMentions('Uma opção é arroz e feijão.',{allergies:'amendoim',restrictions:'sem lactose'}),[]);
});

test('consultas de segurança e encaminhamento não chamam nem consomem cota de IA',()=>{
  assert.match(server,/intent!=='SAFETY'&&intent!=='PROFESSIONAL_REFERRAL'&&await allowAi\(s\.gym,'nutrigym_chat'\)/);
  assert.match(server,/if\(intent==='SAFETY'\)\{text='Interrompa o exercício agora/);
});

test('desempenho usado para progressão vem de sessões concluídas e janela recente',()=>{
  assert.match(server,/wl\.workout_id IN \(SELECT wc\.workout_id FROM workout_completions wc WHERE wc\.gym_id=\$1 AND wc\.student_id=\$2 ORDER BY wc\.completed_at DESC LIMIT 3\)/);
  assert.match(server,/EXISTS\(SELECT 1 FROM workout_completions wc WHERE wc\.gym_id=wl\.gym_id AND wc\.student_id=wl\.student_id AND wc\.workout_id=wl\.workout_id\)/);
});

test('assistente recebe regras de negócio e contexto com escopo da intenção',()=>{
  assert.match(groq,/allergies e restrictions como bloqueios rígidos/);
  assert.match(groq,/findRestrictedFoodMentions/);
  assert.match(server,/import \{nutritionFallback,personalFallback\} from '\.\/assistantFallback\.js'/);
  assert.match(server,/text=personalFallback\(context\)/);
  assert.match(server,/const fallback=imageDataUrl\?nutritionFallback\(context\)/);
  const raw={today:'2026-11-01',student:{full_name:'Ana'},profile:{allergies:'amendoim'},meals:[{meal_date:'2026-11-01',meal_type:'almoço',protein_g:20}],goals:[],workouts:[{name:'Treino A'}],logs:[],workoutHistory:[]};
  const n=buildNutriContext(raw,'RECOMMENDATION','O que posso comer?');
  const p=buildPersonalContext(raw,'TRAINING_PROGRESS','Como evoluí?');
  assert.equal(n.profile.allergies,'amendoim');
  assert.equal(p.training.active_workouts[0].name,'Treino A');
});

test('fotos seguem no dispositivo e endpoints de análise remota continuam desativados',()=>{
  assert.match(server,/student-api\/nutrigym\/meals\/analyze',[^\n]*reply\.code\(410\)/);
  assert.match(server,/student-api\/nutrigym\/meals\/vision',[^\n]*reply\.code\(410\)/);
});
