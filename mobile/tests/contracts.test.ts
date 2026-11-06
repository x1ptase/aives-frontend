import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backendUrl, countdown, newer, parseState, validateCommand } from '../src/contracts.ts';
import { state,turn,client } from './fixtures.ts';
const parse=(s:unknown)=>parseState({code:1000,result:s},17);
test('Student DTO whitelist removes internal fields at every nested level',()=>{
  const s=parse({...state(),referenceAnswer:'SECRET',rubric:'SECRET',questions:[{questionOrder:1,status:'ACTIVE',answerRemainingMs:90000,outcomeReason:null,content:'SECRET'}]});
  assert(!JSON.stringify(s).includes('SECRET'));
});
test('wrong exam, malformed active turn, inconsistent completion cannot render as success',()=>{
  for(const bad of [state({studentExamId:18}),state({currentTurnId:'invalid'}),state({phase:'COMPLETED'}),state({audioReceived:'true'}),state({followUpsUsed:3}),state({revision:-1})])assert.throws(()=>parse(bad));
});
test('completed/expired come only from internally consistent server state',()=>{
  const s=parse(state({phase:'COMPLETED',status:'COMPLETED',currentQuestionOrder:null,currentTurnId:null,followUpIndex:null,language:null,questions:[{questionOrder:1,status:'ANSWERED',answerRemainingMs:0,outcomeReason:null}],answerRemainingMs:null}));
  assert.equal(s.phase,'COMPLETED');
});
test('server timestamps anchor answer budget; processing never spends answer time',()=>{
  assert.equal(countdown(parse(state()),10000).answer,80000);
  assert.equal(countdown(parse(state({phase:'DECIDING',submissionId:turn})),10000).answer,90000);
  assert.equal(countdown(parse(state()),6000000).slot,0);
});
test('stale REST/WS responses cannot rewind revision or accepted audio',()=>{
  const s=parse(state({audioReceived:true}));
  assert.equal(newer(s,parse(state({revision:3}))),s);
  assert.equal(newer(s,parse(state())),s);
  assert.equal(newer(s,parse(state({revision:5,leaseUntil:'2026-11-05T10:00:20Z'}))).leaseUntil,s.leaseUntil);
});
test('only private demo HTTP; public hosts require TLS; no URL credentials/query',()=>{
  for(const url of ['http://192.168.1.2:8080','http://10.0.2.2:8080','http://172.16.1.2:8080','https://api.avies.example'])assert.equal(backendUrl(url),url);
  for(const url of ['http://example.com','http://192.168.1.2.evil.example','http://172.32.1.2','https://user:pass@example.com','https://example.com?token=secret','https://example.com/api','http://256.1.1.1'])assert.throws(()=>backendUrl(url));
});
test('immutable command validates scope and forbids navigation targets outside REVISIT',()=>{
  const c={requestId:turn,clientSessionId:client,expectedRevision:4,turnId:turn,action:'SUBMIT' as const};validateCommand(c);
  assert.throws(()=>validateCommand({...c,targetQuestionOrder:1}));assert.throws(()=>validateCommand({...c,turnId:'../../other'}));
});
