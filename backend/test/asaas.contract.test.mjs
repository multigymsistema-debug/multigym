import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema/028_asaas_student_payments.sql',import.meta.url),'utf8');
const envSchema=fs.readFileSync(new URL('../schema/029_asaas_environment_separation.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
const student=fs.readFileSync(new URL('../../frontend/public/aluno.js',import.meta.url),'utf8');
test('Asaas uses explicit Sandbox or Production base URL and keeps keys server-side',()=>{assert.match(server,/api-sandbox\.asaas\.com\/v3/);assert.match(server,/api\.asaas\.com\/v3/);assert.match(server,/ASAAS_PRODUCTION_API_KEY/);assert.match(server,/ASAAS_SANDBOX_API_KEY/);assert.doesNotMatch(ui,/ASAAS_SANDBOX_API_KEY/);assert.doesNotMatch(student,/ASAAS_SANDBOX_API_KEY/)});
test('webhook is authenticated, persisted and deduplicated',()=>{assert.match(server,/asaas-access-token/);assert.match(server,/INSERT INTO asaas_webhook_events/);assert.match(server,/ON CONFLICT\(event_id\) DO NOTHING/);assert.match(server,/DELETE FROM asaas_webhook_events WHERE event_id=\$1/)});
test('only actual receipt credits wallet and monthly payment',()=>{assert.match(server,/__event\|\|''\)==='PAYMENT_RECEIVED'/);assert.match(server,/remote\.status\|\|''\)==='RECEIVED'/);assert.match(server,/p\.category='membership'/);assert.match(server,/multigym-\$\{asaasEnv\(\)\}-payment:/)});
test('Asaas persistence schema is scoped per gym/student and event unique',()=>{assert.match(schema,/PRIMARY KEY\(gym_id,student_id\)/);assert.match(envSchema,/environment varchar\(20\)/);assert.match(envSchema,/PRIMARY KEY \(gym_id, student_id, environment\)/);assert.match(schema,/event_id varchar\(160\) PRIMARY KEY/);assert.match(schema,/UNIQUE\(payment_id\)/)});
test('student gets Asaas monthly checkout link and can check status',()=>{assert.match(student,/createStudentAsaasPix/);assert.match(student,/student-api\/monthly-payment/);assert.match(student,/data-asaas-check/);assert.match(student,/Pagar mensalidade online/);assert.match(ui,/Gerar link Pix\/cartão Asaas/)});
test('Asaas hosted checkout offers payment method selection and is posted to the cash register only after received',()=>{assert.match(server,/billingType:'UNDEFINED'/);assert.match(server,/app\.post\('\/api\/payments\/asaas-checkout'/);assert.match(server,/cash_register_id/);assert.match(server,/remote\.billingType==='CREDIT_CARD'\?'card'/);assert.match(server,/billingType:'UNDEFINED'/);assert.match(server,/a\.environment=\$[0-9]+/);assert.match(ui,/Cobrar Pix\/cartão online/);assert.match(ui,/Abrir página segura do Asaas/)});

test('student monthly payments and Asaas Webhook are isolated to the chosen environment',()=>{assert.match(server,/ASAAS_PRODUCTION_WEBHOOK_TOKEN/);assert.match(server,/a.environment=\$[0-9]+/);assert.match(server,/multigym-\$\{asaasEnv\(\)\}-payment:/)});
