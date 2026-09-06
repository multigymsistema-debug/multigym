import test from 'node:test';
import assert from 'node:assert/strict';
import {decideAssistantAction} from '../dist/assistantDecision.js';
test('silencia séries comuns para evitar spam',()=>assert.equal(decideAssistantAction({assistant:'personalgym',intent:'QUESTION',event:{type:'SET_COMPLETED'}}).shouldRespond,false));
test('fala em exercício concluído e treino concluído',()=>{assert.equal(decideAssistantAction({assistant:'personalgym',intent:'QUESTION',event:{type:'EXERCISE_COMPLETED'}}).shouldRespond,true);assert.equal(decideAssistantAction({assistant:'personalgym',intent:'QUESTION',event:{type:'WORKOUT_COMPLETED'}}).responseType,'EVENT_FEEDBACK')});
test('segurança sempre tem prioridade',()=>{const d=decideAssistantAction({assistant:'nutrition',intent:'SAFETY'});assert.equal(d.shouldRespond,true);assert.equal(d.priority,'high')});
test('hidratação repetida pode ficar silenciosa',()=>{const d=decideAssistantAction({assistant:'nutrition',intent:'QUESTION',event:{type:'HYDRATION_LOW'},context:{last_hydration_reminder_at:Date.now()}});assert.equal(d.shouldRespond,false)});
