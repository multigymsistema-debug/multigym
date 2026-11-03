import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../schema/034_saas_asaas.sql',import.meta.url),'utf8');
test('platform subscription uses MultiGym checkout and server-side monthly card subscription',()=>{
 assert.ok(server.includes("saasAsaasReady=()=>Boolean(asaasEnv()==='production'?process.env.ASAAS_PRODUCTION_API_KEY:process.env.ASAAS_SANDBOX_API_KEY)"));
 assert.ok(server.includes("app.post('/api/checkout/:token/pay'"));
 assert.ok(server.includes("asaasRequest('/subscriptions','POST'"));
 assert.ok(server.includes("billingType:'CREDIT_CARD'"));
 assert.ok(server.includes("cycle:'MONTHLY'"));
 assert.ok(server.includes("app.get('/api/checkout/:token'"));
 assert.ok(!server.slice(server.indexOf("app.post('/api/saas/checkout'"),server.indexOf("app.get('/api/saas/plans'")).includes('MP_ACCESS_TOKEN'));
});
test('legacy Mercado Pago subscriptions cannot be duplicated or overwritten',()=>{assert.ok(server.includes('existing?.mp_preapproval_id'));assert.ok(server.includes('não será duplicada nem cancelada automaticamente'));});
test('recurring webhook confirms only matched and authorized subscription payments',()=>{assert.ok(server.includes("type==='SUBSCRIPTION_CREATED'"));assert.ok(server.includes("type==='PAYMENT_RECEIVED'&&['RECEIVED','CONFIRMED'].includes(String(remote.status))"));assert.ok(server.includes("req.headers['asaas-access-token']"));});
test('SaaS migration keeps provider identifiers additive',()=>{for(const field of ['asaas_checkout_id','asaas_subscription_id','asaas_customer_id','asaas_external_reference','asaas_checkout_url','asaas_environment','asaas_amount'])assert.ok(schema.includes(`ADD COLUMN IF NOT EXISTS ${field}`));assert.doesNotMatch(schema,/DROP COLUMN.*mp_preapproval_id/i);});
test('SaaS UI separates the platform subscription from student billing',()=>{assert.ok(main.includes('Assinar plano mensal (cartão)'));assert.ok(main.includes('Assinatura mensal do MultiGym · cartão'));assert.ok(main.includes('independente das mensalidades cobradas dos alunos'));});
