import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema/028_asaas_student_payments.sql',import.meta.url),'utf8');
const envSchema=fs.readFileSync(new URL('../schema/029_asaas_environment_separation.sql',import.meta.url),'utf8');
const cashSchema=fs.readFileSync(new URL('../schema/030_asaas_checkout_cash.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
const student=fs.readFileSync(new URL('../../frontend/public/aluno.js',import.meta.url),'utf8');
test('Asaas environments and credentials remain separated server-side',()=>{
  assert.ok(server.includes('https://api-sandbox.asaas.com/v3'));
  assert.ok(server.includes('https://api.asaas.com/v3'));
  assert.ok(server.includes('ASAAS_PRODUCTION_API_KEY'));
  assert.ok(server.includes('ASAAS_SANDBOX_API_KEY'));
  assert.doesNotMatch(ui,/ASAAS_SANDBOX_API_KEY/);
  assert.doesNotMatch(student,/ASAAS_SANDBOX_API_KEY/);
});
test('webhook authentication and event idempotency are preserved',()=>{
  assert.ok(server.includes('asaas-access-token'));
  assert.ok(server.includes('INSERT INTO asaas_webhook_events'));
  assert.ok(server.includes('ON CONFLICT(event_id) DO NOTHING'));
});
test('only confirmed Asaas receipts become paid and enter the cash register',()=>{
  assert.ok(server.includes("String(remote.__event||'')==='PAYMENT_RECEIVED'"));
  assert.ok(server.includes("String(remote.status)==='RECEIVED'"));
  assert.ok(server.includes("remote.billingType==='CREDIT_CARD'?'card'"));
  assert.ok(server.includes('cash_register_id'));
});
test('hosted Asaas invoice lets the payer choose available payment methods',()=>{
  assert.ok(server.includes("billingType:'UNDEFINED'"));
  assert.ok(server.includes("app.post('/api/payments/asaas-checkout'"));
  assert.ok(ui.includes('Cobrar Pix/cartão online'));
  assert.ok(ui.includes('Abrir página segura do Asaas'));
  assert.ok(student.includes('Pagar mensalidade online'));
  assert.ok(server.includes("process.cwd(),'schema/030_asaas_checkout_cash.sql'"));
});
test('student payments are separated by environment and event ids remain unique',()=>{
  assert.ok(envSchema.includes('environment varchar(20)'));
  assert.ok(schema.includes('event_id varchar(160) PRIMARY KEY'));
  assert.ok(cashSchema.includes('cash_register_id'));
  assert.ok(server.includes('ASAAS_PRODUCTION_WEBHOOK_TOKEN'));
});
