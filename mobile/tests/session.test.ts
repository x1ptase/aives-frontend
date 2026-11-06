import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExamSession } from '../src/session.ts';
import { ApiError, parseState } from '../src/contracts.ts';
import { state,turn,client } from './fixtures.ts';
const settle=()=>new Promise(r=>setTimeout(r,5));
function fixture(){
  let s=parseState({code:1000,result:state()},17),sequence=10,draft:any=null;
  const calls:{kind:string;value?:any}[]=[],memory=new Map<string,string>();
  const store={get:async(k:string)=>memory.get(k)??null,set:async(k:string,v:string|null)=>{calls.push({kind:'persist',value:v});v===null?memory.delete(k):memory.set(k,v)}};
  const api={base:'http://192.168.1.2:8080',token:'private-jwt',runtime:async()=>({mode:'LIVE',providersReady:true,streamingSttReady:true,streamingTtsReady:true}),get:async()=>s,open:async()=>s,
    action:async(cId:number,c:any)=>{calls.push({kind:'action',value:c});return s},lease:async()=>({serverTime:s.serverTime,leaseUntil:s.leaseUntil,terminal:false}),question:async()=> 'Bạn hãy giải thích thêm?'};
  const audio={connect:async(...a:any[])=>{calls.push({kind:'connect',value:a});draft={command:JSON.parse(a[6]),sent:false,bytes:3244}},
    disconnect:async()=>{calls.push({kind:'disconnect'})},finish:async(op:string,c:string)=>{draft={command:JSON.parse(c),sent:true,bytes:3244};calls.push({kind:'finish',value:JSON.parse(c)})},
    readDraft:async()=>draft?JSON.stringify(draft):null,deleteDraft:async()=>{draft=null;calls.push({kind:'delete'})},reserveDraft:async(scope:string,c:string)=>{draft={...draft,command:JSON.parse(c),sent:true};calls.push({kind:'reserve',value:JSON.parse(c)})},
    uploadDraft:async()=>{calls.push({kind:'upload'});return JSON.stringify({code:1000,result:s})},speak:async()=>{calls.push({kind:'speak'})},stopSpeech:()=>{calls.push({kind:'stopSpeech'})}};
  const engine=new ExamSession(17,client,'scope',api,audio,store,()=>`30000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`,()=>{},()=>1000);
  return {engine,api,audio,calls,memory,setState:(v:Record<string,unknown>)=>{s=parseState({code:1000,result:state(v)},17)},getDraft:()=>draft,setDraft:(d:any)=>{draft=d}};
}
test('opening an exam view never starts an attempt; only explicit open claims it',async()=>{
  const f=fixture();let opened=0;f.api.open=async()=>{opened++;return f.api.get()};await f.engine.init();assert.equal(opened,0);assert.equal(f.engine.view.controlled,false);await f.engine.open();assert.equal(opened,1);await f.engine.dispose();
});
test('native PCM connection uses AUTH/START data, not a client transcript or provider key',async()=>{
  const f=fixture();await f.engine.init();await f.engine.open();await f.engine.record();
  const args=f.calls.find(v=>v.kind==='connect')!.value,request=JSON.parse(args[4]);
  assert.deepEqual(Object.keys(request).sort(),['clientSessionId','expectedRevision','turnId']);assert.equal(args[2],'private-jwt');assert(!JSON.stringify(request).includes('transcript'));await f.engine.dispose();
});
test('SUBMIT persisted before FINISH; exact same request kept on uncertain outcome',async()=>{
  const f=fixture();await f.engine.init();await f.engine.open();await f.engine.record();const op=f.calls.find(v=>v.kind==='connect')!.value[0];
  f.engine.onAudio({operation:op,kind:'ready',payload:'',code:0});await f.engine.submit();
  const finish=f.calls.findIndex(v=>v.kind==='finish');assert(finish>0);assert(f.calls.slice(0,finish).some(v=>v.kind==='persist'&&v.value&&JSON.parse(v.value).action==='SUBMIT'));
  const c=f.engine.view.pending;f.engine.onAudio({operation:op,kind:'error',payload:'',code:1811});await settle();assert.equal(f.engine.view.pending?.requestId,c?.requestId);assert.equal(f.engine.view.draft?.command.requestId,c?.requestId);await f.engine.dispose();
});
test('partial/final segments remain temporary; only server RESULT becomes saved transcript',async()=>{
  const f=fixture();await f.engine.init();await f.engine.open();await f.engine.record();const op=f.calls.find(v=>v.kind==='connect')!.value[0];
  f.engine.onAudio({operation:op,kind:'ready',payload:'',code:0});f.engine.onAudio({operation:op,kind:'socket',payload:JSON.stringify({type:'FINAL',segmentIndex:1,text:'Câu trả lời tạm'}),code:0});
  assert.equal(f.engine.view.state!.transcripts.length,0);assert.equal(f.engine.view.interim,'Câu trả lời tạm');await f.engine.dispose();
});
test('push before RESULT cannot rewind state; normal socket close after RESULT is quiet',async()=>{
  const f=fixture();await f.engine.init();await f.engine.open();await f.engine.record();const op=f.calls.find(v=>v.kind==='connect')!.value[0];
  f.engine.onAudio({operation:op,kind:'ready',payload:'',code:0});await f.engine.submit();
  f.setState({phase:'DECIDING',revision:6,submissionId:turn,audioReceived:true});
  f.engine.onAudio({operation:op,kind:'socket',payload:JSON.stringify({type:'PROGRESS',revision:6,state:await f.api.get()}),code:0});
  f.engine.onAudio({operation:op,kind:'socket',payload:JSON.stringify({type:'RESULT',state:await f.api.get()}),code:0});
  f.engine.onAudio({operation:op,kind:'closed',payload:'',code:0});await settle();
  assert.equal(f.engine.view.state!.revision,6);assert.equal(f.engine.view.issue,'');assert.equal(f.engine.view.pending,null);assert.equal(f.engine.view.draft,null);await f.engine.dispose();
});
test('background interrupts native work and disables ownership without granting exam time',async()=>{
  const f=fixture();await f.engine.init();await f.engine.open();const deadline=f.engine.view.state!.deadline;await f.engine.foreground(false);assert.equal(f.engine.view.controlled,false);assert.equal(f.engine.view.state!.deadline,deadline);await f.engine.record();assert(!f.calls.some(v=>v.kind==='connect'));await f.engine.dispose();
});
test('TTS failure or missing end never sends PROMPT_FINISHED',async()=>{
  const f=fixture();f.setState({phase:'SPEAKING'});f.audio.speak=async()=>{throw new ApiError(1809)};await f.engine.init();await f.engine.open();await f.engine.listen();assert(!f.calls.some(v=>v.kind==='action'));assert(f.engine.view.issue.includes('hạn mức'));await f.engine.dispose();
});
test('successful native playback must drain before PROMPT_FINISHED is sent',async()=>{
  const f=fixture();f.setState({phase:'SPEAKING'});let release!:()=>void;f.audio.speak=()=>new Promise<void>(r=>{release=r});await f.engine.init();await f.engine.open();const playing=f.engine.listen();await settle();assert(!f.calls.some(v=>v.kind==='action'));release();await playing;assert(f.calls.some(v=>v.kind==='action'&&v.value.action==='PROMPT_FINISHED'));await f.engine.dispose();
});
test('new recording blocked by unresolved private draft',async()=>{
  const f=fixture();f.setDraft({command:{requestId:turn,turnId:turn,clientSessionId:client,expectedRevision:4,action:'SUBMIT'},sent:true,bytes:3244});await f.engine.init();await f.engine.open();await f.engine.record();assert(!f.calls.some(v=>v.kind==='connect'));await f.engine.dispose();
});
test('recovery persists the reserved SUBMIT in native draft before its REST write',async()=>{
  const f=fixture();f.setDraft({command:{requestId:turn,turnId:turn,clientSessionId:client,expectedRevision:4,action:'SUBMIT'},sent:false,bytes:3244});await f.engine.init();await f.engine.open();await f.engine.recover();
  const reserve=f.calls.findIndex(v=>v.kind==='reserve'),write=f.calls.findIndex(v=>v.kind==='action');assert(reserve>=0&&write>reserve);assert.equal(f.calls[reserve].value.requestId,f.calls[write].value.requestId);await f.engine.dispose();
});
test('uncertain SUBMIT reconciles its original receipt before technical RETRY and WAV upload',async()=>{
  const f=fixture(),command={requestId:turn,turnId:turn,clientSessionId:client,expectedRevision:4,action:'SUBMIT' as const};
  f.setDraft({command,sent:true,bytes:3244});f.memory.set('pending.scope',JSON.stringify(command));
  f.setState({phase:'TECHNICAL_ERROR',revision:6,submissionId:turn,processingErrorCode:1811});
  const original=f.api.action;f.api.action=async(id,c)=>{await original(id,c);if(c.action==='RETRY')f.setState({phase:'TRANSCRIBING',revision:7,submissionId:turn});return f.api.get()};
  const upload=f.audio.uploadDraft;f.audio.uploadDraft=async()=>{f.setState({phase:'DECIDING',revision:8,submissionId:turn,audioReceived:true});return upload()};
  await f.engine.init();await f.engine.open();await f.engine.recover();
  assert.deepEqual(f.calls.filter(v=>v.kind==='action').map(v=>v.value.action),['SUBMIT','RETRY']);assert(f.calls.some(v=>v.kind==='upload'));assert.equal(f.engine.view.pending,null);assert.equal(f.engine.view.draft,null);await f.engine.dispose();
});
test('native recovery/storage errors become a visible issue instead of an unhandled rejection',async()=>{
  const f=fixture();f.setDraft({command:{requestId:turn,turnId:turn,clientSessionId:client,expectedRevision:4,action:'SUBMIT'},sent:false,bytes:3244});
  f.audio.reserveDraft=async()=>{throw new Error('private native failure')};await f.engine.init();await f.engine.open();await assert.doesNotReject(()=>f.engine.recover());assert(f.engine.view.issue);assert(!f.engine.view.issue.includes('private native'));await f.engine.dispose();
});
test('lease released at completion is reconciled after an in-flight write without a false other-device error',async()=>{
  const f=fixture();f.setState({phase:'TECHNICAL_ERROR',submissionId:turn,processingErrorCode:1816});await f.engine.init();await f.engine.open();
  let release!:(s:any)=>void;f.api.action=()=>new Promise(r=>{release=r});f.api.lease=async()=>{throw new ApiError(1803)};
  const write=f.engine.command('RETRY');await settle();const heartbeat=f.engine.heartbeat();
  f.setState({revision:8,phase:'COMPLETED',status:'COMPLETED',currentQuestionOrder:null,currentTurnId:null,followUpIndex:null,language:null,questions:[{questionOrder:1,status:'ANSWERED',answerRemainingMs:0,outcomeReason:null}],answerRemainingMs:null});
  release(await f.api.get());await write;await heartbeat;assert.equal(f.engine.view.state!.phase,'COMPLETED');assert.equal(f.engine.view.issue,'');await f.engine.dispose();
});
