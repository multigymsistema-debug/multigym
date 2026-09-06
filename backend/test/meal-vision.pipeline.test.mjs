import test from 'node:test';
import assert from 'node:assert/strict';
import {imageDataUrlValid,numeric,normalizeVision,parseVisionResponse,validateMealAnalysis} from '../dist/mealVisionPipeline.js';

const trace='00000000-0000-4000-8000-000000000001';
const food=(extra={})=>({name:'arroz branco',estimated_quantity_g:120,quantity_range_g:[96,144],unit_count:null,portion_label:'porção média',portion_basis:'visual_area',preparation:'cozido',preparation_confidence:.8,ingredients_visible:[],ingredients_unknown:[],alternatives:[],ambiguity:null,calories:156,protein_g:3,carbs_g:34,fat_g:.4,confidence:.86,...extra});
const response=(foods=[food()],extra={})=>({can_analyze:true,meal_type:'Almoço',confidence:'high',confidence_score:.86,foods,questions:[],notes:'estimativa',...extra});

test('1. JSON válido',()=>assert.equal(parseVisionResponse(JSON.stringify(response()),trace).ok,true));
test('2. JSON dentro de markdown json',()=>assert.equal(parseVisionResponse('```json\n'+JSON.stringify(response())+'\n```',trace).ok,true));
test('3. espaços e quebras extras',()=>assert.equal(parseVisionResponse('  \n '+JSON.stringify(response())+' \n',trace).ok,true));
test('4. texto antes e depois recupera único objeto',()=>{const r=parseVisionResponse('Análise:\n'+JSON.stringify(response())+'\nEspero que ajude.',trace);assert.equal(r.ok,true);assert.equal(r.parse_recovered,true)});
test('5. JSON truncado',()=>assert.equal(parseVisionResponse('{"can_analyze":true,"foods":[{"name":"arroz"',trace).diagnostic.code,'RAW_RESPONSE_TRUNCATED'));
test('6. resposta vazia',()=>assert.equal(parseVisionResponse('',trace).diagnostic.code,'VISION_PROVIDER_EMPTY_RESPONSE'));
test('7. campo obrigatório ausente',()=>assert.equal(normalizeVision(response([food({estimated_quantity_g:undefined})]),trace).diagnostic.code,'NORMALIZATION_MISSING_FIELD'));
test('8. números como strings inequívocas',()=>{const r=normalizeVision(response([food({estimated_quantity_g:'150 g',calories:'195',protein_g:'4',carbs_g:'42',fat_g:'0.5',confidence:'0.85'})]),trace);assert.equal(r.ok,true);assert.equal(r.value.foods[0].estimated_quantity_g,150)});
test('9. número inválido',()=>assert.equal(normalizeVision(response([food({calories:'aproximadamente'})]),trace).diagnostic.code,'NORMALIZATION_INVALID_VALUE'));
test('10. confiança fora de 0–1',()=>assert.equal(normalizeVision(response([food({confidence:1.5})]),trace).diagnostic.code,'NORMALIZATION_INVALID_CONFIDENCE'));
test('11. quantidade negativa',()=>assert.equal(normalizeVision(response([food({estimated_quantity_g:-2})]),trace).diagnostic.code,'NORMALIZATION_INVALID_QUANTITY'));
test('12. macronutrientes incompatíveis',()=>assert.equal(normalizeVision(response([food({calories:10,protein_g:100,carbs_g:0,fat_g:0})]),trace).diagnostic.code,'NORMALIZATION_INVALID_MACROS'));
test('13. alimento duplicado',()=>assert.equal(normalizeVision(response([food(),food({calories:100})]),trace).diagnostic.code,'NORMALIZATION_DUPLICATE_FOOD'));
test('14. vários alimentos válidos',()=>{const r=normalizeVision(response([food(),food({name:'feijão',calories:76,protein_g:5,carbs_g:14,fat_g:.5,confidence:.8})]),trace);assert.equal(r.ok,true);assert.equal(r.value.foods.length,2);assert.equal(r.value.totals.calories,232)});
test('15. perguntas da IA são preservadas',()=>{const r=normalizeVision(response([food()],{questions:['O molho é de creme ou leite de coco?']}),trace);assert.deepEqual(r.value.questions,['O molho é de creme ou leite de coco?'])});
test('16. imagem inválida',()=>{assert.equal(imageDataUrlValid('data:image/jpeg;base64,not valid!'),false);assert.equal(imageDataUrlValid('data:image/jpeg;base64,AAAA'),true)});
test('17. timeout é categoria distinta no contrato',async()=>{const source=await import('node:fs/promises').then(x=>x.readFile(new URL('../src/groq.ts',import.meta.url),'utf8'));assert.match(source,/VISION_PROVIDER_TIMEOUT/)});
test('18. erro HTTP é categoria distinta no contrato',async()=>{const source=await import('node:fs/promises').then(x=>x.readFile(new URL('../src/groq.ts',import.meta.url),'utf8'));assert.match(source,/VISION_PROVIDER_ERROR/)});
test('19. resposta inesperada do provedor é categoria distinta',async()=>{const source=await import('node:fs/promises').then(x=>x.readFile(new URL('../src/groq.ts',import.meta.url),'utf8'));assert.match(source,/VISION_PROVIDER_UNEXPECTED_RESPONSE/)});
test('20. sucesso completo e validação final',()=>{const r=validateMealAnalysis(response([food()]),trace);assert.equal(r.ok,true);assert.equal(r.value.totals.protein_g,3)});
