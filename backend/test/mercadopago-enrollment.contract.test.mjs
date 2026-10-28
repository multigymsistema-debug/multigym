import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../schema/026_mercadopago_enrollment_orders.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../../../frontend/src/main.tsx',import.meta.url),'utf8');
test('Orders Pix keeps sandbox credentials server-side and uses pending state',()=>{
 assert.match(server,/MP_ORDERS_ACCESS_TOKEN/); assert.match(server,/MP_ORDERS_ENV!=='sandbox'/); assert.match(server,/X-Idempotency-Key/);
 assert.match(server,/status='pending'/); assert.match(server,/method:\{id:'pix',type:'bank_transfer'\}/);
 assert.match(server,/multigym-enrollment:/);
});
test('Payment reconciliation validates external reference and amount before marking paid',()=>{
 assert.match(server,/remote\.external_reference!==`multigym-enrollment:\$\{id\}`/);
 assert.match(server,/Number\(remote\.total_amount\)!==Number\(current\.amount\)/);
 assert.match(server,/remote\.status==='processed'&&detail==='accredited'/);
 assert.match(server,/SET status='paid',paid_at=now\(\)/);
 assert.match(server,/INSERT INTO cash_movements/);
});
test('pending Orders have dedicated storage and enrollment pending status',()=>{
 assert.match(migration,/UNIQUE\(order_id\)/); assert.match(migration,/UNIQUE\(enrollment_id\)/);
 assert.match(migration,/status IN \('active','expiring','expired','cancelled','pending'\)/);
});
test('UI presents QR and copy-paste and polls until confirmation',()=>{
 assert.match(ui,/qr_code_base64/); assert.match(ui,/qr_code\|\|/); assert.match(ui,/setInterval\(poll,8000\)/);
});
