import { ApiError, countdown, errorText, newer, parseState, record, terminal, validateCommand } from './contracts.ts';
import type { Action, Command, Draft, Runtime, State } from './contracts.ts';
import type { Api } from './api';
import type { AudioNative, AudioEvent } from './native';
import type { Store } from './storage';

type Port=Pick<Api,'base'|'token'|'get'|'open'|'action'|'lease'|'runtime'|'question'>;
type Audio=Pick<AudioNative,'connect'|'disconnect'|'finish'|'readDraft'|'deleteDraft'|'reserveDraft'|'uploadDraft'|'speak'|'stopSpeech'>;
export interface View {
  state:State|null; runtime:Runtime|null; busy:boolean; loading:boolean; controlled:boolean; receivedAt:number;
  mic:'idle'|'connecting'|'recording'|'submitting'; speech:'idle'|'loading'|'playing'; interim:string; issue:string;
  draft:Draft|null; pending:Command|null; question:string|null;
}
/** One owner, immutable receipts, server-confirmed state transitions. No mobile-specific exam rules. */
export class ExamSession {
  view:View={state:null,runtime:null,busy:false,loading:true,controlled:false,receivedAt:0,mic:'idle',speech:'idle',interim:'',issue:'',draft:null,pending:null,question:null};
  private notify:(view:View)=>void; private active=true; private disposed=false;
  private locked=false; private reading=false; private leasing=false; private operation:string|null=null;
  private speechOperation:string|null=null; private captureTurn:string|null=null; private queued:State|null=null;
  private segments=new Map<number,string>(); private partial=''; private waitTimer:ReturnType<typeof setTimeout>|null=null;
  private autoTurn:string|null=null; private audioSubmitted=false;
  private resultSeen=false;
  private closing:Promise<void>=Promise.resolve(); private lastSendCode:number|null=null;
  readonly id:number;readonly client:string;readonly scope:string;
  private api:Port;private audio:Audio;private store:Store;private makeId:()=>string;private now:()=>number;
  constructor(id:number,client:string,scope:string,api:Port,audio:Audio,store:Store,
    makeId:()=>string,notify:(view:View)=>void,now=()=>performance.now()) {
    this.id=id;this.client=client;this.scope=scope;this.api=api;this.audio=audio;this.store=store;this.makeId=makeId;this.notify=notify;this.now=now;
  }
  private patch(v:Partial<View>){if(this.disposed)return;this.view={...this.view,...v};this.notify(this.view)}
  private issue(e:unknown){const code=e instanceof ApiError?e.code:Number(String((e as any)?.message||'').match(/\((\d{4})\)/)?.[1]||9005);this.patch({issue:errorText(code)});return code}
  private async remember(c:Command|null){await this.store.set(`pending.${this.scope}`,c?JSON.stringify(c):null);this.patch({pending:c})}
  private apply(next:State){
    if(this.disposed)return;
    if(this.locked){this.queued=newer(this.queued,next);return}
    const old=this.view.state,value=newer(old,next);if(value===old)return;
    if(old?.currentTurnId!==value.currentTurnId||value.phase!=='ANSWERING')this.patch({question:null});
    this.patch({state:value,receivedAt:this.now(),...(terminal(value)?{controlled:false,issue:''}:{})});
    if(this.operation&&(!['ANSWERING','TRANSCRIBING','DECIDING'].includes(value.phase)||value.currentTurnId!==this.captureTurn))void this.disconnect();
    if(this.speechOperation&&(value.currentTurnId!==old?.currentTurnId||!['PREPARING','SPEAKING'].includes(value.phase))){this.audio.stopSpeech();this.speechOperation=null;this.patch({speech:'idle'})}
  }
  private unlock(){this.locked=false;this.patch({busy:false});if(this.queued){const s=this.queued;this.queued=null;this.apply(s)}}
  async init(){
    try{const p=await this.store.get(`pending.${this.scope}`);if(p){const c=JSON.parse(p);validateCommand(c);if(c.clientSessionId!==this.client)throw new ApiError(9006);this.patch({pending:c})}
      this.patch({runtime:await this.api.runtime()});await this.refresh();await this.syncDraft();
    }catch(e){this.issue(e)}finally{this.patch({loading:false})}
  }
  async refresh(){
    if(this.reading||this.locked||this.disposed||!this.active)return;
    this.reading=true;
    try{this.apply(await this.api.get(this.id))}catch(e){if(!(e instanceof ApiError&&[1800,1303].includes(e.code)))this.issue(e)}
    finally{this.reading=false}
    if(this.view.mic==='idle')await this.syncDraft();
  }
  async syncDraft(){
    if(this.disposed||this.view.mic==='recording'||this.view.mic==='connecting')return;
    try{
      const raw=await this.audio.readDraft(this.scope);
      if(!raw){this.patch({draft:null});return}
      const d=JSON.parse(raw);validateCommand(d.command);
      if(d.command.clientSessionId!==this.client||d.command.action!=='SUBMIT'||!Number.isSafeInteger(d.bytes)||d.bytes<44||d.bytes>8*1024*1024||typeof d.sent!=='boolean')throw new ApiError(9006);
      const s=this.view.state;
      if(s&&(terminal(s)||s.currentTurnId!==d.command.turnId||s.audioReceived)){
        if(terminal(s)||s.currentTurnId!==d.command.turnId)await this.disconnect();
        await this.audio.deleteDraft(this.scope);this.patch({draft:null});
        if(this.view.pending?.requestId===d.command.requestId)await this.remember(null);
      }else this.patch({draft:{command:d.command,bytes:d.bytes,sent:d.sent}});
    }catch(e){this.issue(e)}
  }
  async open(){
    if(this.locked||this.disposed||this.view.pending&&this.view.pending.action!=='SUBMIT')return;
    if(!this.view.state&&(!this.view.runtime?.providersReady||!this.view.runtime.streamingSttReady||!this.view.runtime.streamingTtsReady)){this.patch({issue:'Backend chưa sẵn sàng cho thi streaming. Kiểm tra cấu hình dịch vụ hiện có.'});return}
    this.locked=true;this.patch({busy:true,issue:''});
    let next:State|null=null;
    try{while(this.reading)await new Promise(r=>setTimeout(r,20));next=await this.api.open(this.id,this.client);this.patch({controlled:!terminal(next)});this.queued=next}
    catch(e){this.patch({controlled:false});this.issue(e)}finally{this.unlock()}
    await this.syncDraft();
    if(next?.phase==='ANSWERING'&&!this.view.draft&&!this.view.pending)await this.command('REPLAY');
  }
  private commandFor(action:Action,targetQuestionOrder?:number):Command{
    const s=this.view.state;if(!s)throw new ApiError(1800);
    return {requestId:this.makeId(),clientSessionId:this.client,expectedRevision:s.revision,turnId:s.currentTurnId,action,...(action==='REVISIT'?{targetQuestionOrder}:{})};
  }
  async command(action:Action,target?:number){
    if(this.locked||this.view.pending||!this.view.controlled||!this.view.state||terminal(this.view.state)||this.view.mic!=='idle')return;
    if(this.view.speech!=='idle'){this.audio.stopSpeech();this.speechOperation=null;this.patch({speech:'idle'});await this.refresh()}
    await this.send(this.commandFor(action,target));
  }
  private async send(c:Command){
    if(this.locked||this.disposed)return;this.locked=true;this.patch({busy:true,issue:''});
    this.lastSendCode=null;
    try{while(this.reading)await new Promise(r=>setTimeout(r,20));await this.remember(c);const s=await this.api.action(this.id,c);this.queued=s;await this.remember(null)}
    catch(e){if(e instanceof ApiError){this.lastSendCode=e.code;if(!e.uncertain){await this.remember(null);if(e.code===1803)this.patch({controlled:false})}}this.issue(e)}
    finally{this.unlock()}
    await this.refresh();
  }
  async retryPending(){if(this.view.pending&&this.view.pending.action!=='SUBMIT')await this.send(this.view.pending);else await this.recover()}
  async heartbeat(){
    if(this.leasing||!this.active||this.disposed||!this.view.controlled||!this.view.state||terminal(this.view.state))return;
    this.leasing=true;
    try{const r=await this.api.lease(this.id,this.client);if(this.disposed)return;if(r.terminal)await this.refresh();
      else if(this.view.state&&r.leaseUntil&&Date.parse(r.leaseUntil)>Date.parse(this.view.state.leaseUntil))this.patch({state:{...this.view.state,leaseUntil:r.leaseUntil}})
    }catch(e){if(e instanceof ApiError&&e.code===1803){
      while(!this.disposed&&this.active&&(this.locked||this.reading))await new Promise(r=>setTimeout(r,20));
      if(this.disposed||!this.active)return;
      await this.refresh();if(this.view.state&&!terminal(this.view.state)){this.patch({controlled:false});await this.disconnect();this.audio.stopSpeech();this.issue(e)}
    }}
    finally{this.leasing=false}
  }
  valid(phase:'ANSWERING'|'SPEAKING',turn?:string){
    const s=this.view.state;if(!s||!this.view.controlled||!this.active||this.disposed||turn&&s.currentTurnId!==turn||terminal(s))return false;
    const elapsed=this.now()-this.view.receivedAt,t=countdown(s,elapsed);
    return (phase==='SPEAKING'?['PREPARING','SPEAKING'].includes(s.phase):s.phase===phase)&&t.slot>0&&Date.parse(s.leaseUntil)-Date.parse(s.serverTime)>elapsed&&(phase!=='ANSWERING'||t.answer===null||t.answer>0);
  }
  async listen(auto=false){
    const s=this.view.state;if(!s?.currentTurnId||!this.valid('SPEAKING')||this.view.busy||this.view.speech!=='idle'||this.view.mic!=='idle')return;
    if(auto&&this.autoTurn===s.currentTurnId)return;this.autoTurn=s.currentTurnId;
    const op=this.makeId();this.speechOperation=op;this.patch({speech:'loading',issue:''});
    try{
      await this.closing;
      await this.audio.speak(op,this.api.base,this.api.token,this.id,JSON.stringify({clientSessionId:this.client,turnId:s.currentTurnId,expectedRevision:s.revision}));
      if(this.speechOperation!==op||!this.valid('SPEAKING',s.currentTurnId))return;
      this.speechOperation=null;this.patch({speech:'idle'});await this.refresh();
      if(this.valid('SPEAKING',s.currentTurnId)&&this.view.state?.phase==='SPEAKING')await this.command('PROMPT_FINISHED');
    }catch(e){if(this.speechOperation===op&&!this.disposed){this.speechOperation=null;this.patch({speech:'idle'});this.issue(e);await this.refresh()}}
  }
  async record(){
    if(!this.valid('ANSWERING')||this.view.busy||this.view.pending||this.view.draft||this.view.mic!=='idle'||this.operation||this.view.speech!=='idle')return;
    const s=this.view.state!,op=this.makeId();this.operation=op;this.captureTurn=s.currentTurnId;this.audioSubmitted=false;this.resultSeen=false;this.segments.clear();this.partial='';
    this.patch({mic:'connecting',interim:'',issue:''});
    try{
      await this.closing;
      await this.audio.connect(op,this.api.base,this.api.token,this.id,JSON.stringify({clientSessionId:this.client,turnId:s.currentTurnId,expectedRevision:s.revision}),this.scope,JSON.stringify(this.commandFor('SUBMIT')));
      this.waitTimer=setTimeout(()=>{if(this.view.mic==='connecting')void this.failCapture(new ApiError(1811))},15000);
    }catch(e){await this.failCapture(e)}
  }
  async submit(){
    if(this.locked||!this.operation||this.view.mic!=='recording'||this.disposed)return;
    const op=this.operation,c=this.commandFor('SUBMIT');this.locked=true;this.patch({busy:true,mic:'submitting',issue:''});
    try{
      while(this.reading)await new Promise(r=>setTimeout(r,20));await this.remember(c);
      this.audioSubmitted=true;await this.audio.finish(op,JSON.stringify(c));
      if(this.waitTimer)clearTimeout(this.waitTimer);
      this.waitTimer=setTimeout(()=>{if(this.operation===op&&this.view.mic==='submitting')void this.failCapture(new ApiError(1811,true))},30000);
    }catch(e){this.unlock();await this.failCapture(e)}
  }
  onAudio(e:AudioEvent){
    if(this.disposed)return;
    if(e.operation===this.speechOperation&&e.kind==='playing'){this.patch({speech:'playing'});return}
    if(e.operation!==this.operation)return;
    if(e.kind==='ready'){if(this.waitTimer)clearTimeout(this.waitTimer);this.waitTimer=null;this.patch({mic:'recording'});return}
    if(e.kind==='limit'){void this.submit();return}
    if(this.resultSeen&&(e.kind==='closed'||e.kind==='error'&&e.code===1811)){void this.disconnect().then(()=>this.refresh());return}
    if(['error','interrupted','closed'].includes(e.kind)){void this.failCapture(new ApiError(e.code||1811,true));return}
    if(e.kind!=='socket')return;
    try{
      const msg=JSON.parse(e.payload);
      if(!record(msg))throw new ApiError(1811);
      if(['PARTIAL','FINAL'].includes(msg.type)){
        if(!Number.isSafeInteger(msg.segmentIndex)||msg.segmentIndex<1||typeof msg.text!=='string'||msg.text.length>20000||msg.text.includes('\0'))throw new ApiError(1811);
        if(msg.type==='FINAL'){this.segments.set(msg.segmentIndex,msg.text);this.partial=''}else this.partial=msg.text;
        this.patch({interim:[...[...this.segments].sort((a,b)=>a[0]-b[0]).map(v=>v[1]),this.partial].filter(Boolean).join(' ')});
      }else if(msg.type==='RESULT'){
        if(!this.audioSubmitted)throw new ApiError(1811);
        const state=parseState({code:1000,result:msg.state},this.id);this.queued=newer(this.queued,state);
        this.resultSeen=true;
        if(this.waitTimer)clearTimeout(this.waitTimer);this.waitTimer=null;
        void (async()=>{try{await this.remember(null)}catch(e){this.issue(e)}finally{this.patch({mic:'idle'});this.unlock();await this.syncDraft()}})();
      }else if(msg.type==='PROGRESS'){
        if(!Number.isSafeInteger(msg.revision)||msg.revision<0)throw new ApiError(1811);
        if(msg.state!==undefined){const s=parseState({code:1000,result:msg.state},this.id);if(s.revision!==msg.revision)throw new ApiError(1811);this.apply(s)}else void this.refresh();
      }else throw new ApiError(1811);
    }catch(e){void this.failCapture(e)}
  }
  private async disconnect(){const op=this.operation;this.operation=null;if(this.waitTimer)clearTimeout(this.waitTimer);this.waitTimer=null;if(op)this.closing=this.closing.then(()=>this.audio.disconnect(op)).catch(()=>{});await this.closing;this.patch({mic:'idle'})}
  private async failCapture(e:unknown){
    await this.disconnect();if(this.locked)this.unlock();this.issue(e);await this.refresh();await this.syncDraft();
  }
  async recover(){
    try{await this.recoverDraft()}catch(e){this.issue(e);if(this.locked)this.unlock()}
  }
  private async recoverDraft(){
    if(this.locked||!this.view.controlled||this.disposed)return;
    await this.disconnect();await this.refresh();await this.syncDraft();
    const d=this.view.draft,s=this.view.state;
    if(this.view.pending?.action==='SUBMIT'){
      const receipt=this.view.pending;
      if(d)await this.audio.reserveDraft(this.scope,JSON.stringify(receipt));
      await this.send(receipt);await this.syncDraft();if(this.view.pending)return;
    }
    if(!d||!s||terminal(s)||this.view.state?.currentTurnId!==d.command.turnId||this.view.state?.audioReceived)return;
    if(this.view.state?.phase==='TECHNICAL_ERROR'){await this.command('RETRY');await this.refresh()}
    if(this.view.state?.phase==='PAUSED')await this.command('RESUME');
    const current=this.view.state!;
    if(current.phase==='ANSWERING'){
      // A definitely unsent recording may use a fresh revision. An uncertain FINISH keeps its original receipt.
      const c=this.view.pending?.action==='SUBMIT'?this.view.pending:d.sent?d.command:this.commandFor('SUBMIT');
      await this.audio.reserveDraft(this.scope,JSON.stringify(c));await this.send(c);
      if(this.lastSendCode===1802&&this.view.state?.phase==='ANSWERING'&&this.view.state.currentTurnId===d.command.turnId&&!this.view.pending){
        const replacement=this.commandFor('SUBMIT');await this.audio.reserveDraft(this.scope,JSON.stringify(replacement));await this.send(replacement);
      }
      await this.syncDraft();
    }
    const next=this.view.state;
    if(!next||next.phase!=='TRANSCRIBING'||next.currentTurnId!==d.command.turnId||!next.submissionId||next.audioReceived||this.view.pending)return;
    this.locked=true;this.patch({busy:true,issue:''});
    try{
      const raw=await this.audio.uploadDraft(this.api.base,this.api.token,this.id,next.submissionId,JSON.stringify({clientSessionId:this.client,turnId:next.currentTurnId}),this.scope);
      this.queued=parseState(JSON.parse(raw),this.id);
    }catch(e){this.issue(e)}finally{this.unlock()}
    await this.syncDraft();
  }
  async discard(){
    try{await this.discardDraft()}catch(e){this.issue(e)}
  }
  private async discardDraft(){
    if(this.locked)return;await this.disconnect();await this.refresh();
    const s=this.view.state;
    if(!this.view.pending&&s&&['ANSWERING','SPEAKING','PAUSED'].includes(s.phase)){await this.audio.deleteDraft(this.scope);this.patch({draft:null,interim:''})}
    else this.patch({issue:'Chỉ bỏ bản ghi local khi Backend chưa nhận bài. Hãy đối soát trước.'});
  }
  async question(){const s=this.view.state;if(!s?.currentTurnId||s.phase!=='ANSWERING')return;try{const text=await this.api.question(this.id,s.currentTurnId);if(this.view.state?.currentTurnId===s.currentTurnId&&this.view.state.phase==='ANSWERING')this.patch({question:text})}catch(e){this.issue(e)}}
  async foreground(active:boolean){
    this.active=active;if(!active){this.audio.stopSpeech();this.speechOperation=null;this.patch({speech:'idle',controlled:false});await this.disconnect();if(this.locked)this.unlock();await this.syncDraft()}
    else{await this.refresh();this.patch({controlled:false})}
  }
  async tick(){
    const s=this.view.state;if(!s||terminal(s)||!this.active)return;
    const t=countdown(s,this.now()-this.view.receivedAt);
    if(t.slot===0||s.phase==='ANSWERING'&&t.answer===0){if(this.view.mic==='recording')await this.submit();else await this.refresh()}
    if(this.view.controlled&&Date.parse(s.leaseUntil)-Date.parse(s.serverTime)<=this.now()-this.view.receivedAt){this.patch({controlled:false});await this.disconnect();this.audio.stopSpeech()}
  }
  async dispose(){this.active=false;this.audio.stopSpeech();await this.disconnect();this.disposed=true}
}
