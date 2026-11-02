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
 const h=auth(la.data.token),personalPath='/student-api/personalgym/assistant-memories',nutriPath='/student-api/nutrigym/assistant-memories';
 const personalChat=await json('/student-api/personalgym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Prefiro treinar de manhã.'})});assert.equal(personalChat.status,200);
 let personalRows=await json(personalPath,{headers:h});let morning=personalRows.data.find(x=>x.memory_key==='training_time');assert.ok(morning);
 const corrected=await json(`${personalPath}/${morning.id}`,{method:'PUT',headers:h,body:JSON.stringify({memory_value:'à noite'})});assert.equal(corrected.status,200);
 personalRows=await json(personalPath,{headers:h});morning=personalRows.data.find(x=>x.memory_key==='training_time');assert.equal(morning.memory_value,'à noite');
 const updatedChat=await json('/student-api/personalgym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(updatedChat.status,200);assert.match(updatedChat.data.text,/à noite/i);
 const deleted=await json(`${personalPath}/${morning.id}`,{method:'DELETE',headers:h});assert.equal(deleted.status,200);assert.equal(deleted.data.deleted,true);
 const afterDelete=await json(personalPath,{headers:h});assert.ok(!afterDelete.data.some(x=>x.memory_key==='training_time'));
 const nutriChat=await json('/student-api/nutrigym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Prefiro feijão.'})});assert.equal(nutriChat.status,200);
 const mealMemory=await json(nutriPath,{headers:h});let food=mealMemory.data.find(x=>x.memory_key==='food_preference');assert.ok(food);
 const foodCorrected=await json(`${nutriPath}/${food.id}`,{method:'PUT',headers:h,body:JSON.stringify({memory_value:'lentilha'})});assert.equal(foodCorrected.status,200);
 const revised=await json(nutriPath,{headers:h});food=revised.data.find(x=>x.memory_key==='food_preference');assert.equal(food.memory_value,'lentilha');
 const foodDeleted=await json(`${nutriPath}/${food.id}`,{method:'DELETE',headers:h});assert.equal(foodDeleted.status,200);
 const erased=await json(nutriPath,{headers:h});assert.ok(!erased.data.some(x=>x.memory_key==='food_preference'));
 const otherStudent=await json('/student-api/personalgym/assistant',{method:'POST',headers:auth(lb.data.token),body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(otherStudent.status,200);assert.equal(otherStudent.data.memory_count,0);assert.doesNotMatch(otherStudent.data.text,/à noite/i);
 const otherAgent=await json('/student-api/personalgym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Qual horário prefiro para treinar?'})});assert.equal(otherAgent.status,200);assert.equal(otherAgent.data.memory_count,0);
 const personalKnowledge=await json('/student-api/knowledge/search?assistant=personalgym&q=treinamento+resistido+forca',{headers:h});assert.equal(personalKnowledge.status,200);assert.ok(personalKnowledge.data.results.some(x=>x.source.includes('CDC')));assert.ok(personalKnowledge.data.results.every(x=>x.review_status==='reviewed'&&x.source_url));
 const foodKnowledge=await json('/student-api/knowledge/search?assistant=nutrigym&q=rice+calories',{headers:h});assert.equal(foodKnowledge.status,200);assert.ok(foodKnowledge.data.results.some(x=>x.source.includes('USDA')&&x.data_per_100g));
 const noKnowledge=await json('/student-api/knowledge/search?assistant=nutrigym&q=rare+unmatched+phrase+zzzxxyy',{headers:h});assert.equal(noKnowledge.status,200);assert.deepEqual(noKnowledge.data.results,[]);const evidenceReply=await json('/student-api/nutrigym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Quantas calorias tem o arroz cozido?'})});assert.equal(evidenceReply.status,200);assert.match(evidenceReply.data.text,/USDA FoodData Central/i);assert.equal(evidenceReply.data.context.knowledge_count,1);
});

test('questions do not auto-log meals or replace the active workout',async()=>{
 const r=await json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`${unique}-guard`,name:'Guard Admin',email:`${unique}-guard@test.local`,password:'Testing@123'})});assert.equal(r.status,200);
 const st=await json('/api/students',{method:'POST',headers:auth(r.data.token),body:JSON.stringify({full_name:'Guard Student',email:`${unique}-guard-student@test.local`})});assert.equal(st.status,201);
 assert.equal((await json(`/api/students/${st.data.id}/portal-access`,{method:'POST',headers:auth(r.data.token),body:JSON.stringify({email:`${unique}-guard-student@test.local`,password:'Student@123'})})).status,204);
 const login=await json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`${unique}-guard`,email:`${unique}-guard-student@test.local`,password:'Student@123'})});assert.equal(login.status,200);const h=auth(login.data.token);
 const question=await json('/student-api/nutrigym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Comi muito no almoço?'})});assert.equal(question.status,200);const meals=await json('/student-api/nutrigym/meals',{headers:h});assert.equal(meals.status,200);assert.equal(meals.data.length,0);assert.equal(question.data.action,null);
 const created=await json('/api/workouts',{method:'POST',headers:auth(r.data.token),body:JSON.stringify({student_id:st.data.id,name:'Current active workout',objective:'General',starts_on:new Date().toISOString().slice(0,10)})});assert.equal(created.status,201,JSON.stringify(created.data));{const before=await json('/student-api/personalgym',{headers:h});const activeBefore=(before.data.workouts||[]).map(x=>x.id);const ask=await json('/student-api/personalgym/assistant',{method:'POST',headers:h,body:JSON.stringify({message:'Não troque meu treino atual.'})});assert.equal(ask.status,200);assert.equal(ask.data.action,null);assert.doesNotMatch(ask.data.text,/troca|substitu/i);const after=await json('/student-api/personalgym',{headers:h});const activeAfter=(after.data.workouts||[]).map(x=>x.id);assert.deepEqual(activeAfter,activeBefore);}
});
