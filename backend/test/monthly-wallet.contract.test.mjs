import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../schema/027_online_membership_wallet.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../../frontend/src/main.tsx',import.meta.url),'utf8');
const student=fs.readFileSync(new URL('../../frontend/src/nutrigym.tsx',import.meta.url),'utf8');
const master=fs.readFileSync(new URL('../../frontend/src/MasterPortal.tsx',import.meta.url),'utf8');
test('Only confirmed matching Mercado Pago monthly orders mark payment paid',()=>{
 assert.match(server,/remote\.status==='processed'&&remote\.status_detail==='accredited'/);
 assert.match(server,/remote\.external_reference!==`multigym-student-monthly:\$\{id\}`/);
 assert.match(server,/WHERE id=\$1 AND gym_id=\$2 AND student_id=\$3 AND status='pending'/);
});
test('Wallet uses settled online payments only, reserves pending/paid withdrawals and encrypts Pix keys',()=>{
 assert.match(server,/gym_monthly_wallet_withdrawals WHERE gym_id=\$1 AND status IN \('pending','paid'\)/);
 assert.match(server,/SELECT id FROM gyms WHERE id=\$1 FOR UPDATE/);
 assert.match(server,/encryptPixKey\(pixKey\)/);assert.match(server,/decryptPixKey\(r\.pix_key\)/);
});
test('Master can resolve pending withdrawals only, with audit log',()=>{
 assert.match(server,/WHERE id=\$4 AND status='pending' RETURNING id,gym_id,amount,status/);
 assert.match(server,/monthly_wallet_withdrawal_'\+status/);
});
test('Student billing is separate from SaaS and settings, wallet, student Pix and Master UI exist',()=>{
 assert.match(migration,/gym_online_billing_settings/);assert.match(migration,/gym_monthly_wallet_withdrawals/);
 assert.doesNotMatch(migration,/gym_saas_plans|gym_saas_subscriptions/);
 assert.match(ui,/Saldo Mensalidades/);assert.match(ui,/online-billing\/settings/);
 assert.match(student,/Pagar mensalidade por Pix/);assert.match(master,/Saques de mensalidades/);
});
