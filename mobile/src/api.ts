import { ApiError, backendUrl, parsePage, parseState, record, result, validateCommand } from './contracts.ts';
import type { Auth, Command, Runtime } from './contracts';

export class Api {
  readonly base:string; token='';
  constructor(base:string){this.base=backendUrl(base)}
  async request(path:string,body?:object,signal?:AbortSignal):Promise<unknown>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    const cancel=()=>controller.abort(); signal?.addEventListener('abort',cancel);
    try{
      const response=await fetch(this.base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});
      const text=await response.text();if(text.length>2*1024*1024)throw new ApiError(9002);
      let v:unknown;try{v=JSON.parse(text)}catch{throw new ApiError(9002)}
      if(!response.ok||!record(v)||v.code!==1000)throw new ApiError(response.status===401?1003:record(v)&&Number.isInteger(v.code)?v.code:9002,response.status>=500);
      return v;
    }catch(e){if(e instanceof ApiError){if(body&&e.code===9002)e.uncertain=true;throw e}throw new ApiError(9001,true)}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
  }
  async login(username:string,password:string):Promise<Auth>{
    const r=result(await this.request('/auth/signin',{username:username.trim(),password}));
    if(r.authenticated!==true||typeof r.token!=='string'||r.token.length<20||r.token.length>12000||typeof r.username!=='string'||typeof r.fullName!=='string')throw new ApiError(9002);
    if(!['STUDENT','ROLE_STUDENT'].includes(r.role))throw new ApiError(9003);
    this.token=r.token;return {token:r.token,username:r.username,fullName:r.fullName};
  }
  async logout(){try{await this.request('/auth/logout',{token:this.token})}finally{this.token=''}}
  list(page=0){return this.request(`/student-exams/me?page=${page}&size=20`).then(v=>parsePage(v,page))}
  get(id:number){return this.request(`/student-exams/${id}/oral-examination`).then(v=>parseState(v,id))}
  open(id:number,clientSessionId:string){return this.request(`/student-exams/${id}/oral-examination`,{clientSessionId}).then(v=>parseState(v,id))}
  action(id:number,command:Command){validateCommand(command);const body={requestId:command.requestId,clientSessionId:command.clientSessionId,expectedRevision:command.expectedRevision,turnId:command.turnId,action:command.action,...(command.action==='REVISIT'?{targetQuestionOrder:command.targetQuestionOrder}:{})};return this.request(`/student-exams/${id}/oral-examination/actions`,body).then(v=>parseState(v,id)).catch(e=>{if(e instanceof ApiError&&e.code===9002)e.uncertain=true;throw e})}
  async lease(id:number,clientSessionId:string){
    const r=result(await this.request(`/student-exams/${id}/oral-examination/lease`,{clientSessionId}));
    if(typeof r.serverTime!=='string'||!Number.isFinite(Date.parse(r.serverTime))||typeof r.terminal!=='boolean'||(r.terminal?r.leaseUntil!==null:typeof r.leaseUntil!=='string'||Date.parse(r.leaseUntil)<=Date.parse(r.serverTime)||!Number.isFinite(Date.parse(r.leaseUntil))))throw new ApiError(9002);
    return {serverTime:r.serverTime as string,leaseUntil:r.leaseUntil as string|null,terminal:r.terminal as boolean};
  }
  async runtime():Promise<Runtime>{
    const r=result(await this.request('/oral-examination/runtime'));
    if(typeof r.mode!=='string'||typeof r.providersReady!=='boolean'||r.streamingSttReady!=null&&typeof r.streamingSttReady!=='boolean'||r.streamingTtsReady!=null&&typeof r.streamingTtsReady!=='boolean')throw new ApiError(9002);
    return {mode:r.mode,providersReady:r.providersReady,streamingSttReady:r.streamingSttReady===true,streamingTtsReady:r.streamingTtsReady===true};
  }
  async question(id:number,turn:string){
    const r=result(await this.request(`/student-exams/${id}/oral-examination/turns/${turn}/question-text`));
    if(r.turnId!==turn||typeof r.text!=='string'||!r.text.trim()||r.text.length>10000||r.text.includes('\0')||!['vi','en'].includes(r.language))throw new ApiError(9002);
    return r.text as string;
  }
}
