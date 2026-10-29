import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../schema/026_mercadopago_enrollment_orders.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
test('New online enrollments use Asaas while legacy Mercado Pago Orders cannot be initiated',()=>{
 assert.ok(server.includes("if(b.payment_provider==='mercadopago')return reply.code(400)"));
 assert.ok(server.includes("if(b.payment_provider==='asaas')"));
 assert.ok(server.includes("asaasCreateFlexiblePayment({gymId:g,student,paymentId,amount,description:\`MultiGym matrícula \${enrollmentId}\`})"));
 assert.match(server,/status='pending'/);
 assert.ok(server.includes("if(!current)return reply.code(404).send({error:'Cobrança Pix não encontrada.'})"));
});
test('Payment reconciliation validates external reference and amount before marking paid',()=>{
 assert.match(server,/remote\.external_reference!==`multigym-enrollment:\$\{id\}`/);
 assert.match(server,/Number\(remote\.total_amount\)!==Number\(current\.amount\)/);
 assert.match(server,/remote\.status==='processed'&&detail==='accredited'/);
 assert.match(server,/SET status='paid',paid_at=now\(\)/);
 assert.match(server,/INSERT INTO cash_movements/);
});
test('pending Orders have dedicated storage and enrollment pending status',()=>{
 assert.match(migration,/order_id varchar\(100\) NOT NULL UNIQUE/); assert.match(migration,/UNIQUE\(enrollment_id\)/);
 assert.match(migration,/status IN \('active','expiring','expired','cancelled','pending'\)/);
});
test('UI presents hosted enrollment checkout and polls until confirmation',()=>{
 assert.match(ui,/checkout\.checkout\?\.payment_url/); assert.match(ui,/Pagar com Pix ou cartão \(Asaas\)/); assert.match(ui,/setInterval\(poll,8000\)/);
});
