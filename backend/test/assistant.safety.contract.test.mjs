import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const context=fs.readFileSync(new URL('../src/assistantContext.ts',import.meta.url),'utf8');
const studentNutri=fs.readFileSync(new URL('../../frontend/src/nutrigym.tsx',import.meta.url),'utf8');

test('Personal Gym never reintroduces exercises rejected by limitation filters',()=>{
  assert.match(server,/const pool=candidates\.filter\(\(x:any\)=>!unsafeForProfile\(x,profile\)\)/);
  assert.doesNotMatch(server,/const pool=safe\.length\?safe:candidates/);
  assert.match(server,/if\(intent==='SAFETY'\)\{text='Interrompa o exercício agora/);
});

test('safety signals are classified before greetings and include urgent fitness symptoms',()=>{
  const safety=context.indexOf("return 'SAFETY'");
  const greeting=context.indexOf("return 'GREETING'");
  assert.ok(safety>=0&&greeting>=0&&safety<greeting);
  for(const signal of ['dor no peito','falta de ar','desmaio','perda de forca','reacao alergica']) assert.ok(context.includes(signal),`missing ${signal}`);
});

test('NutriGym profile editor allows correcting allergies and dietary restrictions',()=>{
  const profileForm=studentNutri.slice(studentNutri.indexOf('function ProfileForm'),studentNutri.indexOf('function MealForm'));
  assert.match(profileForm,/form\.allergies/);
  assert.match(profileForm,/form\.restrictions/);
  assert.match(profileForm,/form\.dislikes/);
});

test('NutriGym routes urgent safety and referral requests even when the profile is incomplete',()=>{
  const nutriRoute=server.slice(server.indexOf("app.post('/student-api/nutrigym/assistant'"),server.indexOf("const nutritionContext="));
  const safetyGuard=nutriRoute.indexOf("if(intent==='SAFETY')");
  const profileGuard=nutriRoute.indexOf('if(!rawContext.profile)');
  assert.ok(safetyGuard>=0&&profileGuard>safetyGuard);
  assert.ok(nutriRoute.indexOf("if(intent==='PROFESSIONAL_REFERRAL')")>safetyGuard);
  assert.ok(nutriRoute.indexOf('const waterMatch')>profileGuard);
});

test('Personal Gym classifies safety before any automatic workout generation',()=>{
  const personalRoute=server.slice(server.indexOf("app.post('/student-api/personalgym/assistant'"));
  const safety=personalRoute.indexOf("if(intent==='SAFETY')");
  const generate=personalRoute.indexOf('await generateAssistantWorkout(s.gym,s.student,0)');
  assert.ok(safety>=0&&generate>=0);
  assert.ok(safety<generate);
  assert.match(personalRoute,/intent!=='SAFETY'&&intent!=='PROFESSIONAL_REFERRAL/);
});

test('Personal Gym reads safety before any query-dependent generation',()=>{
  const personal=server.slice(server.indexOf("app.post('/student-api/personalgym/assistant'"));
  const guard=personal.indexOf("if(intent==='SAFETY')return");
  const query=personal.indexOf('personalContext(s.gym,s.student)');
  assert.ok(guard>=0&&query>guard);
  assert.doesNotMatch(personal.slice(0,personal.indexOf('let rawContext')),/generateAssistantWorkout/);
});

test('meal images continue to be blocked from server-side provider analysis',()=>{
  assert.match(server,/student-api\/nutrigym\/meals\/analyze',[^\n]*reply\.code\(410\)/);
  assert.match(server,/student-api\/nutrigym\/meals\/vision',[^\n]*reply\.code\(410\)/);
  assert.match(server,/if\(intent==='SAFETY'\)return/);
  assert.match(server,/intent!=='SAFETY'&&intent!=='PROFESSIONAL_REFERRAL'&&await allowAi\(s\.gym,'nutrigym_chat'\)/);
});
