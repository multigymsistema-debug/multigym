import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const server=await readFile(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=await readFile(new URL('../schema/025_saas_trials.sql',import.meta.url),'utf8');
test('new academies receive full platform access for ten days',()=>{
 assert.match(server,/VALUES\(\$1,'trial','trial',now\(\),now\(\)\+interval '10 days'\)/);
 assert.match(server,/\['trial','pending'\]\.includes\(entitlement\.status\).*entitlement\.source==='trial'/);
 assert.match(server,/if\(\['trial','pending'\]\.includes\(sub\.status\)&&sub\.source==='trial'\)return new Date\(sub\.expires_at\)\.getTime\(\)>Date\.now\(\)/);
});
test('all existing academies start a single trial in the migration',()=>{
 assert.match(migration,/trial_started_at timestamptz/);
 assert.match(migration,/UPDATE gym_saas_subscriptions SET status='trial',source='trial',trial_started_at=now\(\),expires_at=now\(\)\+interval '10 days'/);
 assert.match(migration,/WHERE trial_started_at IS NULL/);
});
test('warning begins after seven days and reports remaining days',()=>{
 assert.match(server,/trial_days_remaining/);
 assert.match(server,/Date\.now\(\)-trial_started>=7\*86400000/);
 assert.match(server,/show_trial_warning/);
});
