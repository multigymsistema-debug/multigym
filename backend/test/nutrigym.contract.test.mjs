import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../schema/002_nutrigym.sql',import.meta.url),'utf8');
const extended=fs.readFileSync(new URL('../schema/003_nutrigym_plus.sql',import.meta.url),'utf8');

test('NutriGym exposes authenticated student routes',()=>{
  for(const route of ['/student-api/nutrigym','/student-api/nutrigym/profile','/student-api/nutrigym/meals','/student-api/nutrigym/hydration','/student-api/nutrigym/goals','/student-api/nutrigym/checkins']) assert.match(server,new RegExp(`app\\.(get|post|put|delete)\\('${route.replaceAll('/','\\/')}`));
  assert.match(server,/preHandler:studentAuth/);
});

test('NutriGym queries are scoped by server-derived gym and student',()=>{
  assert.match(server,/const nutritionScope = \(req:any\) => \(\{gym:req\.student\.gym_id, student:req\.student\.student_id\}\)/);
  assert.doesNotMatch(server,/x-tenant-id/);
  for(const table of ['nutrigym_profiles','nutrigym_meals','nutrigym_hydration','nutrigym_goals','nutrigym_checkins']){
    assert.match(migration,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(migration,new RegExp(`FOREIGN KEY \\(gym_id, student_id\\) REFERENCES students\\(gym_id, id\\)`));
  }
});

test('production source has no NutriGym demo persistence',()=>{
  assert.doesNotMatch(server,/\/api\/bootstrap/);
  assert.doesNotMatch(server,/demo@multigym/);
  for(const route of ['/student-api/nutrigym/plan','/student-api/nutrigym/daily-checkins','/student-api/nutrigym/memories','/student-api/nutrigym/shopping']) assert.match(server,new RegExp(`app\\.(get|post|put|delete)\\('${route.replaceAll('/','\\/')}`));
  assert.match(extended,/CREATE TABLE IF NOT EXISTS nutrigym_daily_checkins/);
  assert.match(extended,/CREATE TABLE IF NOT EXISTS nutrigym_memories/);
  assert.match(extended,/CREATE TABLE IF NOT EXISTS nutrigym_shopping_items/);
  assert.match(extended,/CREATE TABLE IF NOT EXISTS nutrigym_plan_versions/);
});
