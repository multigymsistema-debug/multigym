import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
test('Básico bloqueia recursos premium e sugere atualização',()=>{
 assert.match(source,/basic:\['workouts','exercises','products','services','agenda','nutrigym','personalgym','online_billing'\]/);
 assert.match(source,/upgrade_required:true/);
 assert.match(source,/Atualize seu plano para acessar esta função/);
});
test('Básico mantém apenas caixa necessário a matrículas',()=>{
 assert.match(source,/allowedCashPaths=new Set\(\['\/api\/cash\/current','\/api\/cash\/open','\/api\/cash\/close'\]\)/);
 assert.match(source,/somente para recebimentos de matrículas/);
 assert.match(source,/somente pagamentos vinculados a matrículas/);
 assert.match(source,/opening!==0/);
});
test('limite de usuários ativos é contado incluindo conta admin',()=>{
 assert.match(source,/tier==='basic'\?2:tier==='essential'\?4:null/);
 assert.match(source,/count\(\*\)::int count FROM users WHERE gym_id=\$1 AND status='active'/);
 assert.match(source,/incluindo o administrador/);
});
test('planos são classificados e gravados explicitamente',()=>{
 assert.match(source,/plan_code,max_users/);
 assert.match(source,/UPDATE gym_saas_plans SET name=\$1,monthly_price=\$2,description=\$3,active=\$4,plan_code=\$5,max_users=\$6/);
});
