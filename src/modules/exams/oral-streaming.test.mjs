import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { createServer } from 'vite'
import { initTestI18n } from '../../test-utils/i18n.mjs'

let server, transport, Player, context, latency
const saved = { WebSocket:globalThis.WebSocket, window:globalThis.window, localStorage:globalThis.localStorage, fetch:globalThis.fetch, AudioContext:globalThis.AudioContext }
const turn='11111111-1111-4111-8111-111111111111', client='22222222-2222-4222-8222-222222222222'
const request={clientSessionId:client,turnId:turn,expectedRevision:0}
before(async()=>{
  globalThis.window={location:{href:'http://localhost:5173/student/exams/7/oral'}}
  globalThis.localStorage={getItem:()=> 'PRIVATE_BEARER_FIXTURE'}
  server=await createServer({logLevel:'silent',server:{middlewareMode:true,hmr:false,watch:null}})
  await initTestI18n(server)
  transport=await server.ssrLoadModule('/src/modules/exams/components/oralStreamingTransport.ts')
  Player=(await server.ssrLoadModule('/src/modules/exams/components/oralPcmPlayer.ts')).OralPcmPlayer
  latency=(await server.ssrLoadModule('/src/modules/exams/components/oralLatency.ts')).oralLatency
})
after(async()=>{await server.close(); for(const [key,value] of Object.entries(saved)) Object.defineProperty(globalThis,key,{configurable:true,writable:true,value})})

test('AudioWorklet resamples continuously at 48/44.1/16 kHz, including final short frame',async()=>{
  const source=await readFile(new URL('../../../public/oral-pcm-worklet.js',import.meta.url),'utf8')
  for(const rate of [48000,44100,16000]) {
    let Processor; const events=[]
    const sandbox={sampleRate:rate,AudioWorkletProcessor:class {port={postMessage:value=>events.push(value)}},registerProcessor:(_name,ctor)=>{Processor=ctor}}
    vm.runInNewContext(source,sandbox); const processor=new Processor()
    const length=rate+Math.floor(rate/20)
    for(let offset=0;offset<length;offset+=128) processor.process([[new Float32Array(Math.min(128,length-offset)).fill(0.25)]])
    processor.port.onmessage({data:{type:'flush'}})
    const frames=events.filter(e=>e.type==='pcm'), total=frames.reduce((sum,e)=>sum+e.data.byteLength/2,0)
    assert.ok(Math.abs(total-length*16000/rate)<=1)
    assert.ok(frames.every(f=>f.data.byteLength<=3200 && f.data.byteLength%2===0))
    assert.equal(new DataView(frames[0].data).getInt16(0,true),8192)
    assert.equal(events.at(-1).type,'flushed'); assert.equal(processor.process([]),false)
  }
})

class Socket {
  static OPEN=1
  readyState=1; bufferedAmount=0; sent=[]
  constructor(url){this.url=url;Socket.last=this;queueMicrotask(()=>this.onopen?.())}
  send(value){this.sent.push(value);if(typeof value!=='string')return
    const frame=JSON.parse(value)
    if(frame.type==='AUTH')queueMicrotask(()=>this.emit({type:'AUTHENTICATED'}))
    if(frame.type==='START')queueMicrotask(()=>this.emit({type:'READY',sampleRate:16000}))
  }
  emit(frame){this.onmessage?.({data:JSON.stringify(frame)})}
  close(){this.readyState=3;this.onclose?.()}
}
test('WS authenticates in a frame, sends binary audio, never accepts client transcript',async()=>{
  globalThis.WebSocket=Socket;const updates=[]
  const previous=Socket.last
  const connection=new transport.OralStreamingConnection(7,request,(...args)=>updates.push(args));assert.equal(Socket.last,previous)
  await connection.opened()
  const socket=Socket.last;assert.ok(!socket.url.href.includes('PRIVATE_BEARER_FIXTURE'));assert.equal(socket.url.search,'')
  assert.equal(JSON.parse(socket.sent[0]).token,'PRIVATE_BEARER_FIXTURE')
  socket.emit({type:'PARTIAL',segmentIndex:1,text:'Hello'});socket.emit({type:'FINAL',segmentIndex:1,text:'Hello world.'})
  connection.write(new ArrayBuffer(3200));assert.equal(socket.sent.at(-1).byteLength,3200);assert.equal(updates.length,2)
  connection.close()
})
test('WS applies bounded backpressure and reports provider errors instead of a false successful result',async()=>{
  globalThis.WebSocket=Socket
  const connection=new transport.OralStreamingConnection(7,request,()=>{});await connection.opened()
  Socket.last.bufferedAmount=128*1024+1;assert.throws(()=>connection.write(new ArrayBuffer(3200)));connection.close()
  const next=new transport.OralStreamingConnection(7,request,()=>{});await next.opened()
  const pending=next.finish({...request,action:'SUBMIT',requestId:turn})
  await Promise.resolve();Socket.last.emit({type:'ERROR',code:1812})
  await assert.rejects(pending,e=>e.response.data.code===1812)
})
test('WS remains available for revision invalidations while AI decides after successful STT',async()=>{
  globalThis.WebSocket=Socket;const revisions=[]
  const connection=new transport.OralStreamingConnection(7,request,()=>{},revision=>revisions.push(revision));await connection.opened()
  const pending=connection.finish({...request,requestId:turn,action:'SUBMIT'})
  for(let i=0;i<10&&!Socket.last.sent.some(value=>typeof value==='string'&&JSON.parse(value).type==='FINISH');i++)await new Promise(resolve=>setTimeout(resolve,0))
  const state={studentExamId:7,status:'IN_PROGRESS',phase:'DECIDING',revision:1,serverTime:'2035-01-01T10:00:00Z',deadline:'2035-01-01T10:20:00Z',leaseUntil:'2035-01-01T10:01:00Z',
    mainCount:1,currentQuestionOrder:1,currentTurnId:turn,followUpIndex:0,language:'en',followUpsUsed:0,maxFollowUps:1,answerRemainingMs:90000,submissionId:client,
    questions:[{questionOrder:1,status:'ACTIVE',answerRemainingMs:90000,outcomeReason:null}],transcripts:[{questionOrder:1,followUpIndex:0,content:'Final.',savedAt:'2035-01-01T10:00:00Z'}],audioReceived:true}
  Socket.last.emit({type:'RESULT',state});assert.equal((await pending).phase,'DECIDING');assert.equal(Socket.last.readyState,1)
  Socket.last.emit({type:'PROGRESS',revision:2});assert.deepEqual(revisions,[2]);connection.close();assert.equal(Socket.last.readyState,3)
})
const encode=new TextEncoder()
const audio=JSON.stringify({type:'audio',data:'AQACAA=='})+'\n',end='{"type":"end"}\n'
function response(parts){return new Response(new ReadableStream({start(controller){parts.forEach(p=>controller.enqueue(encode.encode(p)));controller.close()}}),{headers:{'Content-Type':'application/x-ndjson'}})}
test('TTS delivers first audio while response is still open, and requires a terminal frame',async()=>{
  let held;globalThis.fetch=async(_url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer PRIVATE_BEARER_FIXTURE');assert.ok(!options.body.includes('PRIVATE_BEARER_FIXTURE'))
    return new Response(new ReadableStream({start(controller){held=controller;controller.enqueue(encode.encode(audio.slice(0,8)));controller.enqueue(encode.encode(audio.slice(8)))}}),{headers:{'Content-Type':'application/x-ndjson'}})
  }
  const chunks=[];let done=false
  const playing=transport.readSpeechStream(7,request,new AbortController().signal,p=>chunks.push(p)).then(()=>{done=true})
  for(let i=0;i<30&&!chunks.length;i++)await new Promise(r=>setTimeout(r,2))
  assert.equal(chunks.length,1);assert.equal(done,false);assert.deepEqual([...chunks[0]],[1,0,2,0])
  held.enqueue(encode.encode(end));held.close();await playing;assert.equal(done,true)
  for(const body of [[audio],[end],[audio,'{"type":"error","code":1809}\n'],[audio.replace('AQACAA==','AQ=='),end]]){
    globalThis.fetch=async()=>response(body)
    await assert.rejects(()=>transport.readSpeechStream(7,request,new AbortController().signal,()=>{}))
  }
})
class AudioContextFixture {
  state='running';currentTime=10;sampleRate=48000;sources=[];destination={}
  constructor(){context=this}
  async resume(){}
  async close(){this.state='closed'}
  createBuffer(_channels,length,rate){const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data}}
  createBufferSource(){const source={connect(){},disconnect(){},stop(){},start(at){this.at=at}};this.sources.push(source);return source}
}
test('PCM playback starts before EOF, schedules chunks without overlap and ends only after all audio',async()=>{
  globalThis.AudioContext=AudioContextFixture;const player=new Player();await player.unlock()
  const pcm=new Uint8Array([0,64,0,192]);player.push(pcm);player.push(pcm)
  assert.equal(context.sources.length,2);assert.equal(context.sources[0].buffer.getChannelData(0)[0],0.5)
  assert.ok(context.sources[1].at>=context.sources[0].at+context.sources[0].buffer.duration)
  let complete=false;const finished=player.complete().then(()=>{complete=true});await Promise.resolve();assert.equal(complete,false)
  context.sources[0].onended();await Promise.resolve();assert.equal(complete,false)
  context.sources[1].onended();await finished;assert.equal(complete,true);player.stop()
})
test('cancelling PCM playback never invokes a successful end',async()=>{
  globalThis.AudioContext=AudioContextFixture;const player=new Player();await player.unlock();player.push(new Uint8Array([0,0]))
  const finished=player.complete();player.stop();await assert.rejects(finished,{name:'AbortError'});assert.equal(context.state,'closed')
})

test('Latency diagnostics correlate submit to next-turn playback and never log transcript, questions or tokens',()=>{
  const previous=console.info, logs=[]; console.info=(...args)=>logs.push(args)
  try {
    latency.begin(turn,7); latency.mark(turn,'finishSent')
    latency.state({studentExamId:7,phase:'DECIDING',currentTurnId:turn})
    latency.state({studentExamId:7,phase:'PREPARING',currentTurnId:client,transcripts:[{content:'PRIVATE_STUDENT_ANSWER'}]})
    latency.mark(client,'ttsRequest'); latency.mark(client,'firstAudio'); latency.audioScheduled(client,50); latency.audioScheduled(client,100)
    assert.equal(logs.length,1); assert.equal(logs[0][0],'oral-latency')
    assert.equal(logs[0][1].fromTurn,turn); assert.equal(logs[0][1].nextTurn,client)
    assert.ok(logs[0][1].submitToPlaybackScheduledMs>=50)
    assert.ok(!JSON.stringify(logs).includes('PRIVATE_STUDENT_ANSWER'))
    latency.begin(turn,7); latency.cancel(turn); latency.state({studentExamId:7,phase:'EXPIRED'}); assert.equal(logs.length,1)
  } finally {console.info=previous}
})

test('WS rejects a pushed state for a different exam instead of applying it',async()=>{
  globalThis.WebSocket=Socket
  const received=[], connection=new transport.OralStreamingConnection(7,request,()=>{},(...args)=>received.push(args));await connection.opened()
  const pending=connection.finish({...request,requestId:turn,action:'SUBMIT'})
  await new Promise(resolve=>setTimeout(resolve,0))
  Socket.last.emit({type:'PROGRESS',revision:3,state:{studentExamId:999,revision:3}})
  await assert.rejects(pending); assert.equal(received.length,0)
})
