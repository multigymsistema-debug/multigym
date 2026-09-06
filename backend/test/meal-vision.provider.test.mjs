import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMealImage} from '../dist/groq.js';

const trace='00000000-0000-4000-8000-000000000002';
const image='data:image/jpeg;base64,AAAA';
const food={name:'arroz',estimated_quantity_g:100,quantity_range_g:[80,120],unit_count:null,portion_label:'média',portion_basis:'visual_area',preparation:'cozido',preparation_confidence:.8,ingredients_visible:[],ingredients_unknown:[],alternatives:[],ambiguity:null,calories:130,protein_g:2.5,carbs_g:28,fat_g:.3,confidence:.85};
const payload=()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({can_analyze:true,foods:[food],confidence_score:.85})}}]});
const withFetch=async(fn)=>{const old=globalThis.fetch,oldKey=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='test-key';try{return await fn()}finally{globalThis.fetch=old;if(oldKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=oldKey}};
test('provider timeout mantém categoria própria',async()=>withFetch(async()=>{globalThis.fetch=async()=>{const e=new Error('timeout');e.name='AbortError';throw e};const r=await analyzeMealImage(image,'Almoço',trace);assert.equal(r.diagnostic.code,'VISION_PROVIDER_TIMEOUT')}));
test('provider HTTP error mantém status e categoria',async()=>withFetch(async()=>{globalThis.fetch=async()=>new Response('rate limited',{status:429});const r=await analyzeMealImage(image,'Almoço',trace);assert.equal(r.diagnostic.code,'VISION_PROVIDER_ERROR');assert.equal(r.diagnostic.provider_status,429)}));
test('provider inesperado não vira resposta vazia',async()=>withFetch(async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({object:'unexpected'}),{status:200,headers:{'content-type':'application/json'}});const r=await analyzeMealImage(image,'Almoço',trace);assert.equal(r.diagnostic.code,'VISION_PROVIDER_UNEXPECTED_RESPONSE')}));
test('provider vazio é diferenciado',async()=>withFetch(async()=>{globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:''}}]}),{status:200});const r=await analyzeMealImage(image,'Almoço',trace);assert.equal(r.diagnostic.code,'VISION_PROVIDER_EMPTY_RESPONSE')}));
test('sucesso completo retorna análise e trace',async()=>withFetch(async()=>{globalThis.fetch=async()=>new Response(payload(),{status:200,headers:{'content-type':'application/json'}});const r=await analyzeMealImage(image,'Almoço',trace);assert.equal(r.ok,true);assert.equal(r.trace_id,trace);assert.equal(r.analysis.foods[0].name,'arroz');assert.equal(r.diagnostic.code,'SUCCESS')}));
