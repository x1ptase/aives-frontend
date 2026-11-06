import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Api } from '../src/api.ts';
import { turn,client } from './fixtures.ts';
test('signin, paginated own schedule and logout use existing BE contracts; JWT never in URL',async()=>{
  const original=globalThis.fetch,calls:{url:string;body:any;headers:any}[]=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url:String(url),body:options?.body?JSON.parse(String(options.body)):null,headers:options?.headers});
    const result=String(url).endsWith('/auth/signin')?{token:'test-token-not-a-real-credential',authenticated:true,role:'STUDENT',username:'student-demo',fullName:'Sinh viên thử nghiệm'}
      :String(url).includes('/student-exams/me')?{items:[],page:0,size:20,totalPages:0,totalElements:0}:null;
    return new Response(JSON.stringify({code:1000,result}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const api=new Api('http://192.168.1.2:8080');await api.login(' student-demo ','test-password');const page=await api.list();await api.logout();
    assert.equal(page.items.length,0);assert.equal(calls[0].url,'http://192.168.1.2:8080/auth/signin');assert.equal(calls[0].body.username,'student-demo');
    assert(calls[1].url.endsWith('/student-exams/me?page=0&size=20'));assert.equal(calls[1].headers.Authorization,'Bearer test-token-not-a-real-credential');
    assert.deepEqual(calls[2].body,{token:'test-token-not-a-real-credential'});assert(calls.every(c=>!c.url.includes('token')&&!c.url.includes('oral-examination')));assert.equal(api.token,'');
  }finally{globalThis.fetch=original}
});
test('Lecturer account cannot be persisted as Student auth',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({code:1000,result:{authenticated:true,token:'test-token-not-a-real-credential',role:'LECTURER',username:'lecturer',fullName:'Giảng viên'}}));
  try{const api=new Api('http://10.0.2.2:8080');await assert.rejects(()=>api.login('lecturer','test'),{code:9003});assert.equal(api.token,'')}finally{globalThis.fetch=original}
});
test('provider/raw SQL errors are mapped to local safe messages, not shown verbatim',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({code:1812,message:'private raw provider detail'}),{status:429});
  try{const api=new Api('http://10.0.2.2:8080');await assert.rejects(()=>api.runtime(),e=>{assert(!String(e).includes('private raw'));return (e as any).code===1812})}finally{globalThis.fetch=original}
});
test('a malformed successful write response remains uncertain so its receipt must be retained',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({code:1000,result:{studentExamId:999}}));
  try{const api=new Api('http://10.0.2.2:8080');await assert.rejects(()=>api.action(17,{requestId:turn,clientSessionId:client,expectedRevision:4,turnId:turn,action:'SUBMIT'}),e=>(e as any).code===9002&&(e as any).uncertain===true)}finally{globalThis.fetch=original}
});
