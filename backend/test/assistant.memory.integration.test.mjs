import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_API_URL||'http://127.0.0.1:3000';
const json=async(path,options={})=>{const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};const r=await fetch(base+path,{...options,headers});return {status:r.status,data:await r.json().catch(()=>null)};};
const auth=token=>({Authorization:`Bearer ${token}`});
const unique=`memory-${Date.now()}`;

test('memory CRUD, recency, agent/tenant isolation and conversational use; knowledge search returns sources by agent',async()=>{
 const [a,b]=await Promise.all([
  json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`${unique}-a`,name:'Memory Admin A',email:`${unique}-a@test.local`,password:'Testing@123'})}),
  json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`${unique}-b`,name:'Memory Admin B',email:`${unique}-b@test.local`,password:'Testing@123'})})
 ]);assert.equal(a.status,200);assert.equal(b.status,200);
 const [sa,sb]=await Promise.all([
  json('/api/students',{method:'POST',headers:auth(a.data.token),body:JSON.stringify({full_name:'Memory Student A',email:`${unique}-sa@test.local`})}),
  json('/api/students',{method:'POST',headers:auth(b.data.token),body:JSON.stringify({full_name:'Memory Student B',email:`${unique}-sb@test.local`})})
 ]);assert.equal(sa.status,201);assert.equal(sb.status,201);
 for(const [admin,student,email] of [[a.data,sa.data,`${unique}-sa@test.local`],[b.data,sb.data,`${unique}-sb@test.local`]])assert.equal((await json(`/api/students/${student.id}/portal-access`,{method:'POST',headers:auth(admin.token),body:JSON.stringify({email,password:'Student@123'})})).status,204);
 const [la,lb]=await Promise.all([json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`${unique}-a`,email:`${unique}-sa@test.local`,password:'Student@123'})}),json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`${unique}-b`,email:`${unique}-sb@test.local`,password:'Student@123'})})]);assert.equal(la.status,200);assert.equal(lb.status,200);
 const concurrent=await Promise.all(['Prefiro treinar de manhã.','Prefiro treinar de manhã.'].map(message=>json('/student-api/personalgym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message})})));assert.ok(concurrent.every(x=>x.status===200));
 const pref=concurrent[0];assert.equal(pref.status,200);const memoryRows=await json('/student-api/personalgym/assistant-memories',{headers:auth(la.data.token)});assert.equal(memoryRows.status,200);assert.equal(memoryRows.data.filter(x=>x.memory_key==='training_time').length,1);
 const recall=await json('/student-api/personalgym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(recall.status,200);assert.equal(recall.data.memory_count,1);assert.match(recall.data.text,/manhã/i);
 const otherStudent=await json('/student-api/personalgym/assistant',{method:'POST',headers:auth(lb.data.token),body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(otherStudent.status,200);assert.equal(otherStudent.data.memory_count,0);assert.doesNotMatch(otherStudent.data.text,/manhã/i);
 const otherAgent=await json('/student-api/nutrigym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(otherAgent.status,200);assert.equal(otherAgent.data.context.memory_count,0);
 const [preference,preference2]=await Promise.all(['Prefiro feijão.','Prefiro feijão.'].map(message=>json('/student-api/nutrigym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message})})));assert.equal(preference.status,200);assert.equal(preference2.status,200);
 const recommend=await json('/student-api/nutrigym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message:'O que posso comer no lanche?'})});assert.equal(recommend.status,200);assert.match(recommend.data.text,/feijão/i);assert.equal(recommend.data.context.memory_count,1);
 const memories=await json('/student-api/nutrigym/assistant-memories',{headers:auth(la.data.token)});assert.equal(memories.status,200);const row=memories.data.find(x=>x.memory_key==='food_preference');assert.ok(row);
 const updated=await json(`/student-api/nutrigym/assistant-memories/${row.id}`,{method:'PUT',headers:auth(la.data.token),body:JSON.stringify({memory_value:'lentilha'})});assert.equal(updated.status,200);
 const revised=await json('/student-api/nutrigym/assistant-memories',{headers:auth(la.data.token)});assert.ok(revised.data.some(x=>x.memory_key==='food_preference'&&x.memory_value==='lentilha'));
 const deleted=await json(`/student-api/nutrigym/assistant-memories/${updated.data.id}`,{method:'DELETE',headers:auth(la.data.token)});assert.equal(deleted.status,200);assert.equal(deleted.data.deleted,true);
 const absent=await json('/student-api/nutrigym/assistant-memories',{headers:auth(la.data.token)});assert.ok(!absent.data.some(x=>x.memory_key==='food_preference'));const deletedAgain=await json(`/student-api/nutrigym/assistant-memories/${updated.data.id}`,{method:'DELETE',headers:auth(la.data.token)});assert.equal(deletedAgain.status,404);
 const personalKnowledge=await json('/student-api/knowledge/search?assistant=personalgym&q=treinamento+resistido+forca',{headers:auth(la.data.token)});assert.equal(personalKnowledge.status,200);assert.ok(personalKnowledge.data.results.some(x=>x.source.includes('CDC')));assert.ok(personalKnowledge.data.results.every(x=>x.review_status==='reviewed'&&x.source_url));
 const foodKnowledge=await json('/student-api/knowledge/search?assistant=nutrigym&q=rice+calories',{headers:auth(la.data.token)});assert.equal(foodKnowledge.status,200);assert.ok(foodKnowledge.data.results.some(x=>x.source.includes('USDA')&&x.data_per_100g));
 const noKnowledge=await json('/student-api/knowledge/search?assistant=nutrigym&q=rare+unmatched+phrase+zzzxxyy',{headers:auth(la.data.token)});assert.equal(noKnowledge.status,200);assert.deepEqual(noKnowledge.data.results,[]);const evidenceReply=await json('/student-api/nutrigym/assistant',{method:'POST',headers:auth(la.data.token),body:JSON.stringify({message:'Quantas calorias tem o arroz cozido?'})});assert.equal(evidenceReply.status,200);assert.match(evidenceReply.data.text,/USDA FoodData Central/i);assert.equal(evidenceReply.data.context.knowledge_count,1);
});

test('questions do not auto-log meals or replace the active workout',async()=>{
 const r=await json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`${unique}-guard`,name:'Guard Admin',email:`${unique}-guard@test.local`,password:'Testing@123'})});assert.equal(r.status,200);
 const st=await json('/api/students',{method:'POST',headers:auth(r.data.token),body:JSON.stringify({full_name:'Guard Student',email:`${unique}-guard-student@test.local`})});assert.equal(st.status,201);
 assert.equal((await json(`/api/students/${st.data.id}/portal-access`,{method:'POST',headers:auth(r.data.token),body:JSON.stringify({email:`${unique}-guard-student@test.local`,password:'Student@123'})})).status,204);
 const login=await json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`${unique}-guard`,email:`${unique}-guard-student@test.local`,password:'Student@123'})});assert.equal(login.status,200);const h=auth(login.data.token);
 const question=await json('/student-api/nutrigym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Comi muito no almoço?'})});assert.equal(question.status,200);const meals=await json('/student-api/nutrigym/meals',{headers:h});assert.equal(meals.status,200);assert.equal(meals.data.length,0);assert.equal(question.data.action,null);
 const created=await json('/api/workouts',{method:'POST',headers:auth(r.data.token),body:JSON.stringify({student_id:st.data.id,name:'Current active workout',objective:'General',starts_on:new Date().toISOString().slice(0,10)})});
 assert.equal(created.status,201,JSON.stringify(created.data));{const before=await json('/student-api/personalgym',{headers:h});const activeBefore=(before.data.workouts||[]).map(x=>x.id);const ask=await json('/student-api/personalgym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Não troque meu treino atual.'})});assert.equal(ask.status,200);assert.equal(ask.data.action,null);assert.doesNotMatch(ask.data.text,/troca|substitu/i);const after=await json('/student-api/personalgym',{headers:h});const activeAfter=(after.data.workouts||[]).map(x=>x.id);assert.deepEqual(activeAfter,activeBefore);}
});
