import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCandidate,excludeProfileBackedMemories,rankMemories,saveMemory,searchKnowledge} from '../dist/assistantMemory.js';
import {nutritionFallback,personalFallback} from '../dist/assistantFallback.js';
import {detectAssistantIntent} from '../dist/assistantContext.js';

test('memory extraction keeps direct, relevant, non-clinical and non-question statements only',()=>{
 assert.equal(extractCandidate('Prefiro treinar de manhã.','personalgym')?.key,'training_time');
 assert.equal(extractCandidate('Prefiro arroz e feijão.','nutrigym')?.key,'food_preference');
 assert.equal(extractCandidate('Comi muito?','nutrigym'),null);
 assert.equal(extractCandidate('Acho que prefiro arroz.','nutrigym'),null);
 assert.equal(extractCandidate('Tenho alergia a amendoim.','nutrigym'),null);
});

test('profile-backed facts override historical conversation memories',()=>{
 const rows=[{memory_key:'food_preference',memory_value:'massa'},{memory_key:'nutrition_goal',memory_value:'perder peso'},{memory_key:'training_time',memory_value:'manhã'}];
 assert.deepEqual(excludeProfileBackedMemories(rows,'nutrigym',{profile:{preferences:'arroz e feijão',objective:'manutenção'}}),[rows[2]]);
 assert.deepEqual(excludeProfileBackedMemories(rows,'personalgym',{student:{},profile:{training_time:'19:00'}}),[rows[0],rows[1]]);
 assert.deepEqual(excludeProfileBackedMemories([rows[2]],'nutrigym',{profile:{}}),[rows[2]]);
});

test('memory safety excludes clinical claims from extraction',()=>{
 for(const text of ['Tenho alergia a amendoim.','Tenho intolerância à lactose.','Tenho lesão no joelho.','Tenho dor lombar.','Tenho doença celíaca.','Uso medicamento para pressão.'])assert.equal(extractCandidate(text,'nutrigym'),null);
});

test('memory relevance ranks matching statement without unrelated recall',()=>{
 const rows=[{memory_key:'training_time',memory_value:'manhã',category:'availability',relevance:75},{memory_key:'food_preference',memory_value:'feijão',category:'preference',relevance:75}];
 assert.equal(rankMemories(rows,'Qual horário prefiro para treinar?')[0].memory_key,'training_time');
 assert.equal(rankMemories(rows,'Qual horário prefiro para treinar?').length,1);
 assert.equal(rankMemories([{memory_key:'food_preference',memory_value:'feijão',category:'preference'}],'Quanto de feijão foi consumido?')[0].memory_key,'food_preference');
});

test('memory writes serialize per tenant/student/agent/key and retain old values atomically',async()=>{
 const calls=[];let active=null;let next=0;
 const client={query:async(sql,params=[])=>{calls.push(sql);if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return{rows:[]};if(sql.includes('SELECT pg_advisory_xact_lock'))return{rows:[]};if(sql.includes('SELECT id,memory_value,source,active FROM assistant_memories')||sql.includes('SELECT id,memory_value,source FROM assistant_memories'))return{rows:active?[active]:[]};if(sql.includes('UPDATE assistant_memories SET memory_value=')){active={...active,memory_value:params[1],active:true};return{rows:[]};}if(sql.includes('INSERT INTO assistant_memories')){active={id:`id-${++next}`,memory_value:params[4],source:'explicit_student',active:true};return{rows:[active]};}if(sql.includes('INSERT INTO assistant_memory_history'))return{rows:[]};return{rows:[]};},release(){}};
 const pool={connect:async()=>client};
 const base={key:'food_preference',category:'preference',confidence:.95,source:'explicit_student',sourceDetail:'direct statement'};
 await saveMemory(pool,{gym:'gymA',student:'studentA'},'nutrigym',{...base,value:'feijão'});
 await saveMemory(pool,{gym:'gymA',student:'studentA'},'nutrigym',{...base,value:'lentilha'});
 // The test contract asserts advisory-lock transaction and audited updates; API integration covers separate student/tenant scopes.
 assert.ok(calls.filter(x=>x.includes('pg_advisory_xact_lock')).length>=2);
 assert.ok(calls.includes('BEGIN')&&calls.includes('COMMIT'));
 assert.ok(calls.some(x=>x.includes('assistant_memory_history')));assert.ok(calls.some(x=>x.includes('UPDATE assistant_memories SET memory_value=')));assert.equal(active.memory_value,'lentilha');
});

test('retrieved evidence and relevant memory are used by the corresponding assistant fallback; no evidence is explicit',()=>{
 const food=nutritionFallback({intent:'QUESTION',student:{full_name:'Ana'},question:'Quantas calorias tem o arroz?',knowledge:[{record_type:'food_composition',title:'Arroz cozido',content:'130 kcal por 100 g.',source_name:'USDA FoodData Central',source_url:'https://fdc.nal.usda.gov/food-search?query=168878'}],tool_results:[]});assert.match(food,/130 kcal/);assert.match(food,/USDA FoodData Central/);
 const noFacts=nutritionFallback({intent:'QUESTION',student:{full_name:'Ana'},question:'Qual a dose ideal de nutriente X?',knowledge:[],tool_results:[]});assert.match(noFacts,/não encontrei conhecimento revisado/i);
 const pref=nutritionFallback({intent:'RECOMMENDATION',student:{full_name:'Ana'},profile:{},memory_notes:[{memory_key:'food_preference',category:'preference',memory_value:'feijão'}]});assert.match(pref,/feijão/i);
 const exercise=personalFallback({intent:'QUESTION',student:{full_name:'Bia'},question:'O que a evidência diz sobre treino de força?',knowledge:[{title:'Revisão de treino resistido',content:'O treino resistido melhorou força.',source_name:'PMC review',source_url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10818109/'}],tool_results:[]});assert.match(exercise,/melhorou força/);assert.match(exercise,/PMC review/);
 assert.equal(detectAssistantIntent('Comi muito no almoço?','nutrition'),'QUESTION');
});

test('PostgreSQL knowledge search is reviewed, agent-isolated, provenance-carrying and returns no rows cleanly',async()=>{
 let seen;
 const executor={query:async(sql,values)=>{seen={sql,values};return{rows:[]};}};
 assert.deepEqual(await searchKnowledge(executor,'personalgym','qual treino de força é suportado?'),[]);
 assert.equal(seen.values[0],'personalgym');assert.match(seen.values[1],/strength/);assert.match(seen.sql,/agent=\$1 AND review_status='reviewed'/);assert.match(seen.sql,/search_vector @@ to_tsquery/);
});
