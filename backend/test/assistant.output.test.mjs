import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanAssistantText} from '../dist/assistantOutput.js';
test('converte tabela de recomendação em lista curta',()=>{const input='Meta\n\n| Opção | Porção | Calorias | Proteína | Por que funciona |\n|---|---|---|---|---|\n| Omelete | 1 porção | ~250 kcal | 22 g | Mais proteína |';const out=cleanAssistantText(input);assert.equal(out.includes('|'),false);assert.match(out,/• Omelete — 1 porção/);assert.equal(out.includes('Mais proteína'),false)});
test('preserva resposta normal sem inventar conteúdo',()=>assert.equal(cleanAssistantText('Coma algo simples.\n\nBeba água.'),'Coma algo simples.\n\nBeba água.'));
