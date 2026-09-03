import test from 'node:test';
import assert from 'node:assert/strict';

const base=process.env.TEST_API_URL||'http://127.0.0.1:3000';
const json=async(path,options={})=>{const r=await fetch(base+path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await r.json().catch(()=>null);return {status:r.status,data};};
const auth=(token)=>({Authorization:`Bearer ${token}`});
const unique=`${Date.now()}`;
let adminA,adminB,studentA,studentB,tokenA,tokenB,mealA;

test('unauthenticated NutriGym requests are rejected',async()=>{const r=await json('/student-api/nutrigym');assert.equal(r.status,401)});
test('profiles, meals and tenant/student isolation work end to end',async()=>{
  const a=await json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`gym-a-${unique}`,name:'Admin A',email:`admin-a-${unique}@test.local`,password:'Testing@123'})});
  const b=await json('/api/auth/register',{method:'POST',body:JSON.stringify({gymName:`gym-b-${unique}`,name:'Admin B',email:`admin-b-${unique}@test.local`,password:'Testing@123'})});
  assert.equal(a.status,200);assert.equal(b.status,200);adminA=a.data;adminB=b.data;
  const sa=await json('/api/students',{method:'POST',headers:auth(adminA.token),body:JSON.stringify({full_name:'Aluno A',email:`student-a-${unique}@test.local`})});
  const sb=await json('/api/students',{method:'POST',headers:auth(adminB.token),body:JSON.stringify({full_name:'Aluno B',email:`student-b-${unique}@test.local`})});
  assert.equal(sa.status,201,JSON.stringify(sa.data));assert.equal(sb.status,201,JSON.stringify(sb.data));studentA=sa.data;studentB=sb.data;
  for(const [admin,student,email] of [[adminA,studentA,`student-a-${unique}@test.local`],[adminB,studentB,`student-b-${unique}@test.local`]]){
    const access=await json(`/api/students/${student.id}/portal-access`,{method:'POST',headers:auth(admin.token),body:JSON.stringify({email,password:'Student@123'})});assert.equal(access.status,204);
  }
  const la=await json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`gym-a-${unique}`,email:`student-a-${unique}@test.local`,password:'Student@123'})});
  const lb=await json('/student-auth/login',{method:'POST',body:JSON.stringify({gymSlug:`gym-b-${unique}`,email:`student-b-${unique}@test.local`,password:'Student@123'})});
  assert.equal(la.status,200);assert.equal(lb.status,200);tokenA=la.data.token;tokenB=lb.data.token;
  const before=await json('/student-api/nutrigym',{headers:auth(tokenA)});assert.equal(before.status,200);assert.equal(before.data.profile,null);assert.equal(before.data.student.id,studentA.id);
  const profile=await json('/student-api/nutrigym/profile',{method:'PUT',headers:auth(tokenA),body:JSON.stringify({student_id:studentB.id,gym_id:adminB.user.gym_id,objective:'Emagrecimento',weight_kg:80,height_cm:180,age:30,water_goal_ml:2500,calories_goal:2200})});
  assert.equal(profile.status,200);assert.equal(profile.data.objective,'Emagrecimento');
  const meal=await json('/student-api/nutrigym/meals',{method:'POST',headers:auth(tokenA),body:JSON.stringify({student_id:studentB.id,gym_id:adminB.user.gym_id,meal_type:'Almoço',description:'Arroz, feijão e frango',calories:650})});
  assert.equal(meal.status,201);mealA=meal.data;
  const own=await json('/student-api/nutrigym',{headers:auth(tokenA)});assert.equal(own.data.student.id,studentA.id);assert.equal(own.data.summary.meals.length,1);
  const other=await json('/student-api/nutrigym',{headers:auth(tokenB)});assert.equal(other.data.student.id,studentB.id);assert.equal(other.data.summary.meals.length,0);
  const deniedDelete=await json(`/student-api/nutrigym/meals/${mealA.id}`,{method:'DELETE',headers:auth(tokenB)});assert.equal(deniedDelete.status,404);
  const deniedRead=await json(`/student-api/nutrigym/meals?date=${mealA.meal_date}`,{headers:auth(tokenB)});assert.equal(deniedRead.status,200);assert.equal(deniedRead.data.length,0);
  const water=await json('/student-api/nutrigym/hydration',{method:'POST',headers:auth(tokenA),body:JSON.stringify({amount_ml:500,student_id:studentB.id,gym_id:adminB.user.gym_id})});assert.equal(water.status,201);
  const invalid=await json('/student-api/nutrigym/hydration',{method:'POST',headers:auth(tokenA),body:JSON.stringify({amount_ml:-1})});assert.equal(invalid.status,400);
});

test('student logout invalidates the session',async()=>{const out=await json('/student-api/logout',{method:'POST',headers:auth(tokenA)});assert.equal(out.status,200);const after=await json('/student-api/nutrigym',{headers:auth(tokenA)});assert.equal(after.status,401)});
