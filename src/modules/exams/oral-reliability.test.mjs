import { before, beforeEach, afterEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { IDBFactory } from 'fake-indexeddb'
import { createElement, act, useLayoutEffect } from 'react'
import { AxiosError } from 'axios'
import { createServer } from 'vite'

/** Mount hook React thật với DOM/IndexedDB test; không gọi backend, mic hoặc dịch vụ AI thật. */
let server, useExam, useSpeech, Provider, client, draft, session, root, host, latest, speech, adapter
let createRoot, dom
const clientId='11111111-1111-4111-8111-111111111111', turnId='22222222-2222-4222-8222-222222222222', job='33333333-3333-4333-8333-333333333333'
const base='http://localhost:8080', time='2035-01-01T10:00:00Z'
const fixture=() => ({ studentExamId:7,status:'IN_PROGRESS',phase:'ANSWERING',revision:8,serverTime:time,deadline:'2035-01-01T10:20:00Z',leaseUntil:'2035-01-01T10:00:45Z',mainCount:1,currentQuestionOrder:1,currentTurnId:turnId,followUpIndex:0,language:'vi',followUpsUsed:0,maxFollowUps:2,answerRemainingMs:180000,submissionId:null,questions:[{questionOrder:1,status:'ACTIVE',answerRemainingMs:180000,outcomeReason:null}],transcripts:[] })
const envelope=result => ({ code:1000,result })
const ready=envelope({mode:'LIVE',providersReady:true,speechReady:true,transcriptionReady:true,audioStorageReady:true,message:'Đã cấu hình.'})
const sleep=ms => new Promise(resolve => setTimeout(resolve,ms))
async function wait(predicate) { for(let i=0;i<100;i++) { await act(async()=>{await sleep(5)}); if(predicate()) return }; assert.fail('Hook chưa đạt trạng thái mong đợi') }
function reject(config,code) { throw new AxiosError('fixture','ERR',config,undefined,{ status:409,data:{code},headers:{},config }) }
function Probe() { const value=useExam(7,'student'); useLayoutEffect(()=>{latest=value}); return null }
function SpeechProbe() { const value=useSpeech('turn',false,()=>false,async()=>new Blob(['wav']),()=>{}); useLayoutEffect(()=>{speech=value}); return null }

before(async()=>{
  dom=new Window({url:'http://localhost:5173/student/exams/7/oral'})
  for(const name of ['window','document','navigator','HTMLElement','Node','localStorage','sessionStorage']) Object.defineProperty(globalThis,name,{configurable:true,value:name==='window'?dom:dom[name]})
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
  globalThis.IS_REACT_ACT_ENVIRONMENT=true
  createRoot=(await import('react-dom/client')).createRoot
  server=await createServer({logLevel:'silent',server:{middlewareMode:true,hmr:false,watch:null}})
  useExam=(await server.ssrLoadModule('/src/modules/exams/hooks/useOralExam.ts')).useOralExam
  useSpeech=(await server.ssrLoadModule('/src/modules/exams/hooks/useOralSpeech.ts')).useOralSpeech
  Provider=(await server.ssrLoadModule('/src/shared/components/common/FeedbackProvider.tsx')).default
  client=(await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  draft=await server.ssrLoadModule('/src/modules/exams/components/oralAudioDraft.ts')
  session=await server.ssrLoadModule('/src/modules/exams/components/oralExamSession.ts')
  const interval=dom.setInterval.bind(dom), timeout=dom.setTimeout.bind(dom)
  dom.setInterval=(callback,ms,...args)=>interval(callback,ms===10000?20:ms===250?10:ms,...args)
  dom.setTimeout=(callback,ms,...args)=>timeout(callback,ms===3000?30:ms===800?15:ms,...args)
  client.defaults.baseURL=base
  client.defaults.adapter=async config=>({data:await adapter(config),status:200,statusText:'OK',headers:{},config})
})
beforeEach(()=>{
  latest=null; speech=null; localStorage.clear(); sessionStorage.clear(); localStorage.setItem('access_token','FIXTURE_TOKEN')
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()})
  sessionStorage.setItem(`${session.oralSessionKey('student',7,base)}:client`,clientId)
  host=document.createElement('div'); document.body.append(host); root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount()); host.remove()})
after(async()=>{await server.close(); await dom.happyDOM.abort(); delete globalThis.IS_REACT_ACT_ENVIRONMENT})

test('GET chậm không làm mất heartbeat, không tạo pending nghiệp vụ và không ghi đè lease mới',async()=>{
  const state=fixture(); state.phase='SPEAKING'; let opened=false, held, leaseCount=0, holding=false
  adapter=async config=>{
    if(config.url.endsWith('/runtime')) return ready
    if(config.url.endsWith('/lease')) { leaseCount++; return envelope({serverTime:time,leaseUntil:'2035-01-01T10:01:00Z'}) }
    if(config.method==='get') {
      if(!opened) reject(config,1800)
      if(!holding) { holding=true; return new Promise(resolve=>{held=()=>resolve(envelope({...state}))}) }
      return envelope({...state})
    }
    opened=true; return envelope({...state})
  }
  await act(async()=>root.render(createElement(Provider,null,createElement(Probe))))
  await wait(()=>latest?.runtime && !latest.loading)
  await act(async()=>latest.open()); await wait(()=>!!held); await wait(()=>leaseCount>=2)
  assert.equal(latest.pending,null); assert.equal(latest.controlled,true)
  await act(async()=>{held(); await sleep(5)})
  assert.equal(latest.state.leaseUntil,'2035-01-01T10:01:00Z')
})

for (const receipt of ['terminal', '1803']) test(`heartbeat ${receipt} khi bài vừa kết thúc đọc kết quả cuối và không nháy lỗi mất quyền`,async()=>{
  let state={...fixture(),phase:'DECIDING',submissionId:job}, leaseCount=0
  adapter=async config=>{
    if(config.url.endsWith('/runtime')) return ready
    if(config.url.endsWith('/lease')) {
      leaseCount++
      state={...state,status:'COMPLETED',phase:'COMPLETED',revision:9,currentTurnId:null,currentQuestionOrder:null,followUpIndex:null,language:null,submissionId:null,answerRemainingMs:null,questions:[{questionOrder:1,status:'ANSWERED',answerRemainingMs:180000,outcomeReason:null}]}
      if(receipt==='1803') reject(config,1803)
      return envelope({serverTime:time,leaseUntil:null,terminal:true})
    }
    return envelope({...state})
  }
  await act(async()=>root.render(createElement(Provider,null,createElement(Probe))))
  await wait(()=>latest?.state && latest.runtime)
  await act(async()=>latest.open())
  await wait(()=>leaseCount>0 && latest.state.phase==='COMPLETED')
  assert.equal(latest.issue,''); assert.equal(latest.controlled,false)
})

test('heartbeat bị tab khác chiếm quyền vẫn báo lỗi khi backend xác nhận bài chưa kết thúc',async()=>{
  const state={...fixture(),phase:'SPEAKING'}
  adapter=async config=>{
    if(config.url.endsWith('/runtime')) return ready
    if(config.url.endsWith('/lease')) reject(config,1803)
    return envelope({...state})
  }
  await act(async()=>root.render(createElement(Provider,null,createElement(Probe))))
  await wait(()=>latest?.state && latest.runtime); await act(async()=>latest.open())
  await wait(()=>!latest.controlled && !!latest.issue)
  assert.equal(latest.state.phase,'SPEAKING')
})

test('bản ghi cũ bị 1802 được gửi lại cùng Blob sau xác nhận từ chối, không cần xóa local hoặc ghi lại',async()=>{
  let state=fixture(), actions=[], uploaded=0
  const key=`${session.oralSessionKey('student',7,base)}:${clientId}`
  const blob=new Blob([new Uint8Array(256)],{type:'audio/webm'})
  await draft.saveAudioDraft(key,{blob,command:{requestId:'44444444-4444-4444-8444-444444444444',clientSessionId:clientId,expectedRevision:2,turnId,action:'SUBMIT'}})
  adapter=async config=>{
    if(config.url.endsWith('/runtime')) return ready
    if(config.url.endsWith('/lease')) return envelope({serverTime:time,leaseUntil:state.leaseUntil})
    if(config.method==='get') return envelope({...state})
    if(config.url.endsWith('/actions')) {
      const command=JSON.parse(config.data); actions.push(command)
      if(command.expectedRevision!==state.revision) reject(config,1802)
      state={...state,revision:9,phase:'TRANSCRIBING',submissionId:job}; return envelope({...state})
    }
    if(config.url.endsWith('/audio')) {
      uploaded++; assert.ok(config.data instanceof FormData); assert.equal(config.data.get('audio').size,256)
      state={...state,revision:10,phase:'DECIDING',audioReceived:true,transcripts:[{questionOrder:1,followUpIndex:0,content:'Câu trả lời đã lưu.',savedAt:time}]}; return envelope({...state})
    }
    return envelope({...state})
  }
  await act(async()=>root.render(createElement(Provider,null,createElement(Probe))))
  await wait(()=>latest?.audioDraft && latest.state)
  await act(async()=>latest.open()); assert.equal(latest.state.phase,'ANSWERING')
  await act(async()=>latest.resumeAudio()); await wait(()=>latest.state.phase==='DECIDING'&&!latest.audioDraft)
  assert.equal(actions.length,2); assert.equal(actions[0].expectedRevision,2); assert.equal(actions[1].expectedRevision,8)
  assert.notEqual(actions[0].requestId,actions[1].requestId); assert.equal(actions[1].turnId,turnId); assert.equal(uploaded,1)
  assert.equal(await draft.loadAudioDraft(key,clientId),null)
})

test('control nghe chưa được bật không tự hiện lỗi đỏ mất quyền khi chỉ đang xem tiến trình',async()=>{
  await act(async()=>root.render(createElement(SpeechProbe)))
  await act(async()=>{await sleep(45)})
  assert.equal(speech.error,''); assert.equal(speech.status,'idle')
})

test('SUBMIT mất response giữ nguyên requestId và Blob, không tự đổi revision khi chưa biết đã commit hay chưa',async()=>{
  const state=fixture(), commands=[], key=`${session.oralSessionKey('student',7,base)}:${clientId}`
  const original={requestId:'44444444-4444-4444-8444-444444444444',clientSessionId:clientId,expectedRevision:8,turnId,action:'SUBMIT'}
  await draft.saveAudioDraft(key,{blob:new Blob([new Uint8Array(256)],{type:'audio/webm'}),command:original})
  adapter=async config=>{
    if(config.url.endsWith('/runtime')) return ready
    if(config.url.endsWith('/lease')) return envelope({serverTime:time,leaseUntil:state.leaseUntil})
    if(config.url.endsWith('/actions')) {
      commands.push(JSON.parse(config.data))
      throw new AxiosError('fixture','ERR',config,undefined,{status:500,data:{code:9999},headers:{},config})
    }
    return envelope({...state})
  }
  await act(async()=>root.render(createElement(Provider,null,createElement(Probe))))
  await wait(()=>latest?.audioDraft && latest.state); await act(async()=>latest.open())
  await act(async()=>latest.resumeAudio())
  assert.deepEqual(commands,[original]); assert.deepEqual(latest.pending,original); assert.equal(latest.audioDraft,true)
  assert.deepEqual((await draft.loadAudioDraft(key,clientId)).command,original)
})
