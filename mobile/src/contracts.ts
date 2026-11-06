/** Student-only contract: no bank questions, reference answer or rubric. */
export type Phase = 'PREPARING'|'SPEAKING'|'ANSWERING'|'TRANSCRIBING'|'DECIDING'|'REVIEW'|'PAUSED'|'TECHNICAL_ERROR'|'COMPLETED'|'EXPIRED';
export type Action = 'PROMPT_FINISHED'|'REPLAY'|'DEFER'|'REVISIT'|'SUBMIT'|'PAUSE'|'RESUME'|'RETRY'|'FINISH';
export interface Command { requestId:string; clientSessionId:string; expectedRevision:number; turnId:string|null; action:Action; targetQuestionOrder?:number }
export interface State {
  studentExamId:number; status:'IN_PROGRESS'|'COMPLETED'|'EXPIRED'; phase:Phase; revision:number;
  serverTime:string; deadline:string; leaseUntil:string; mainCount:number; currentQuestionOrder:number|null;
  currentTurnId:string|null; followUpIndex:number|null; language:'vi'|'en'|null; followUpsUsed:number; maxFollowUps:number;
  answerRemainingMs:number|null; submissionId:string|null; audioReceived:boolean; processingErrorCode:number|null;
  questions:{questionOrder:number; status:'PENDING'|'ACTIVE'|'DEFERRED'|'ANSWERED'|'NO_ANSWER'|'TECHNICAL_ERROR'; answerRemainingMs:number|null; outcomeReason:string|null}[];
  transcripts:{questionOrder:number; followUpIndex:number; content:string; savedAt:string}[];
}
export interface Runtime { mode:string; providersReady:boolean; streamingSttReady:boolean; streamingTtsReady:boolean }
export interface Exam { id:number; sessionId:number; sessionTitle:string; subjectCode:string; subjectName:string; sessionStatus:'UPCOMING'|'ONGOING'|'COMPLETED'; status:'ASSIGNED'|'IN_PROGRESS'|'COMPLETED'|'ABSENT'|'EXPIRED'; slotOrder:number|null; scheduledStartAt:string|null; scheduledEndAt:string|null }
export interface Page { items:Exam[]; page:number; size:number; totalPages:number; totalElements:number }
export interface Auth { token:string; username:string; fullName:string }
export interface Draft { command:Command; bytes:number; sent:boolean }
export class ApiError extends Error {
  code:number; uncertain:boolean;
  constructor(code:number, uncertain=false) { super(errorText(code)); this.code=code; this.uncertain=uncertain; }
}
export const errorText = (code:number) => ({
  1003:'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',1004:'Bạn không có quyền thực hiện thao tác này.',
  1303:'Dữ liệu đang được cập nhật. Hãy tải lại tiến trình.',
  1800:'Lượt thi chưa được bắt đầu.',1801:'Thao tác chưa phù hợp với bước thi hiện tại.',1802:'Tiến trình đã thay đổi. Hãy cập nhật và thử lại.',
  1803:'Lượt thi đang do thiết bị/tab khác điều khiển hoặc quyền đã hết hạn. Đóng nơi thi cũ rồi nhận lại quyền.',
  1807:'Dịch vụ giọng đọc chưa sẵn sàng.',1808:'Giọng đọc bị gián đoạn. Hãy nghe lại cả câu.',1809:'Giọng đọc đang bận hoặc hết hạn mức miễn phí.',
  1810:'STT streaming chưa sẵn sàng.',1811:'Chưa nhận dạng được bản ghi. Hãy kiểm tra tiến trình trước khi thử lại.',1812:'Đang có một lượt STT khác hoặc dịch vụ hết hạn mức. Hãy thử lại sau.',
  1813:'Bản ghi không hợp lệ.',1814:'Bản ghi của lượt này đã được chốt.',1815:'AI hội thoại chưa sẵn sàng.',1816:'AI chưa xử lý được lượt tiếp theo. Transcript đã lưu được giữ lại.',1817:'AI hội thoại đang bận hoặc hết hạn mức.',
  9001:'Không kết nối được Backend. Kiểm tra IP, Wi-Fi và Backend trên laptop.',9002:'Dữ liệu phản hồi không hợp lệ. Hãy tải lại.',
  9003:'Ứng dụng này chỉ dành cho tài khoản Student.',9004:'Chưa được cấp quyền microphone.',9005:'Âm thanh bị gián đoạn. Bài thi chưa tự chuyển bước.',
  9006:'Còn bản ghi chưa xác nhận. Hãy đối soát trước khi ghi câu trả lời mới.',
} as Record<number,string>)[code] || 'Chưa thực hiện được thao tác. Kiểm tra kết nối và cập nhật tiến trình.';
export const record = (v:unknown):v is Record<string,any> => !!v && typeof v==='object' && !Array.isArray(v);
const int=(v:unknown,min=0):v is number => Number.isSafeInteger(v) && Number(v)>=min;
const date=(v:unknown):v is string => typeof v==='string' && Number.isFinite(Date.parse(v));
const rem=(v:unknown)=>v===null||int(v);
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const invalid=():never=>{throw new ApiError(9002)};
export function result(v:unknown):Record<string,any>{if(!record(v)||v.code!==1000||!record(v.result))return invalid();return v.result}
export function parseState(value:unknown,id:number):State {
  const r=result(value), phases=['PREPARING','SPEAKING','ANSWERING','TRANSCRIBING','DECIDING','REVIEW','PAUSED','TECHNICAL_ERROR','COMPLETED','EXPIRED'];
  if(r.studentExamId!==id||!int(r.revision)||!int(r.mainCount,1)||!phases.includes(r.phase)||!['IN_PROGRESS','COMPLETED','EXPIRED'].includes(r.status)
    ||!date(r.serverTime)||!date(r.deadline)||!date(r.leaseUntil)||!int(r.followUpsUsed)||!int(r.maxFollowUps)||r.followUpsUsed>r.maxFollowUps||!rem(r.answerRemainingMs??null)
    ||!Array.isArray(r.questions)||r.questions.length!==r.mainCount||!Array.isArray(r.transcripts))return invalid();
  const inactive=['REVIEW','COMPLETED','EXPIRED'].includes(r.phase);
  if(inactive ? [r.currentTurnId,r.currentQuestionOrder,r.followUpIndex,r.language,r.submissionId].some(v=>v!=null)
    : !uuid(r.currentTurnId)||!int(r.currentQuestionOrder,1)||r.currentQuestionOrder>r.mainCount||!int(r.followUpIndex)||r.followUpIndex>r.followUpsUsed)return invalid();
  if(r.status!==(r.phase==='COMPLETED'?'COMPLETED':r.phase==='EXPIRED'?'EXPIRED':'IN_PROGRESS')
    ||r.submissionId!=null&&!uuid(r.submissionId)||['TRANSCRIBING','DECIDING'].includes(r.phase)&&r.submissionId==null
    ||r.language!=null&&!['vi','en'].includes(r.language)||['SPEAKING','ANSWERING','TRANSCRIBING','DECIDING','PAUSED'].includes(r.phase)&&r.language==null
    ||r.audioReceived!=null&&typeof r.audioReceived!=='boolean'||r.processingErrorCode!=null&&![1810,1811,1812,1813,1815,1816,1817].includes(r.processingErrorCode))return invalid();
  const questions=r.questions.map((q:unknown,i:number)=>{
    if(!record(q)||q.questionOrder!==i+1||!['PENDING','ACTIVE','DEFERRED','ANSWERED','NO_ANSWER','TECHNICAL_ERROR'].includes(q.status)||!rem(q.answerRemainingMs??null)
      ||q.outcomeReason!=null&&(typeof q.outcomeReason!=='string'||q.outcomeReason.length>80))return invalid();
    return {questionOrder:q.questionOrder,status:q.status,answerRemainingMs:q.answerRemainingMs??null,outcomeReason:q.outcomeReason??null};
  });
  const transcripts=r.transcripts.map((t:unknown)=>{
    if(!record(t)||!int(t.questionOrder,1)||t.questionOrder>r.mainCount||!int(t.followUpIndex)||t.followUpIndex>r.followUpsUsed||typeof t.content!=='string'||!t.content.trim()||t.content.length>20000
      ||!date(t.savedAt)||Date.parse(t.savedAt)>Date.parse(r.serverTime))return invalid();
    return {questionOrder:t.questionOrder,followUpIndex:t.followUpIndex,content:t.content,savedAt:t.savedAt};
  });
  if(new Set(transcripts.map((t:any)=>`${t.questionOrder}:${t.followUpIndex}`)).size!==transcripts.length
    ||!inactive&&(questions.filter((q:any)=>q.status==='ACTIVE').length!==1||questions[r.currentQuestionOrder-1].status!=='ACTIVE'||questions[r.currentQuestionOrder-1].answerRemainingMs!==(r.answerRemainingMs??null))
    ||r.phase==='REVIEW'&&(!questions.some((q:any)=>q.status==='DEFERRED')||questions.some((q:any)=>['ACTIVE','PENDING'].includes(q.status)))
    ||r.phase==='COMPLETED'&&questions.some((q:any)=>!['ANSWERED','NO_ANSWER'].includes(q.status)))return invalid();
  return {studentExamId:id,status:r.status,phase:r.phase,revision:r.revision,serverTime:r.serverTime,deadline:r.deadline,leaseUntil:r.leaseUntil,mainCount:r.mainCount,
    currentQuestionOrder:r.currentQuestionOrder??null,currentTurnId:r.currentTurnId??null,followUpIndex:r.followUpIndex??null,language:r.language??null,followUpsUsed:r.followUpsUsed,maxFollowUps:r.maxFollowUps,
    answerRemainingMs:r.answerRemainingMs??null,submissionId:r.submissionId??null,audioReceived:r.audioReceived===true,processingErrorCode:r.processingErrorCode??null,questions,transcripts};
}
export function validateCommand(c:Command){
  if(!uuid(c.requestId)||!uuid(c.clientSessionId)||c.turnId!==null&&!uuid(c.turnId)||!int(c.expectedRevision)
    ||!['PROMPT_FINISHED','REPLAY','DEFER','REVISIT','SUBMIT','PAUSE','RESUME','RETRY','FINISH'].includes(c.action)
    ||(c.action==='REVISIT'?!int(c.targetQuestionOrder,1):c.targetQuestionOrder!==undefined))return invalid();
}
export function parsePage(v:unknown,page:number):Page {
  const r=result(v);if(r.page!==page||!int(r.size,1)||!int(r.totalPages)||!int(r.totalElements)||!Array.isArray(r.items)||r.items.length>r.size)return invalid();
  const items=r.items.map((e:unknown)=>{
    if(!record(e)||!int(e.id,1)||!int(e.sessionId,1)||!['UPCOMING','ONGOING','COMPLETED'].includes(e.sessionStatus)||!['ASSIGNED','IN_PROGRESS','COMPLETED','ABSENT','EXPIRED'].includes(e.status)
      ||['sessionTitle','subjectCode','subjectName'].some(k=>typeof e[k]!=='string'||e[k].length>1000)||e.slotOrder!==null&&!int(e.slotOrder,1)
      ||e.scheduledStartAt!==null&&!date(e.scheduledStartAt)||e.scheduledEndAt!==null&&!date(e.scheduledEndAt))return invalid();
    return {id:e.id,sessionId:e.sessionId,sessionTitle:e.sessionTitle,subjectCode:e.subjectCode,subjectName:e.subjectName,sessionStatus:e.sessionStatus,status:e.status,slotOrder:e.slotOrder,scheduledStartAt:e.scheduledStartAt,scheduledEndAt:e.scheduledEndAt};
  });return {items,page:r.page,size:r.size,totalPages:r.totalPages,totalElements:r.totalElements};
}
export const terminal=(s:State)=>s.phase==='COMPLETED'||s.phase==='EXPIRED';
export function countdown(s:State,elapsed:number){const d=terminal(s)?0:Math.max(0,elapsed);return {slot:Math.max(0,Date.parse(s.deadline)-Date.parse(s.serverTime)-d),answer:s.answerRemainingMs==null?null:Math.max(0,s.answerRemainingMs-(s.phase==='ANSWERING'?d:0))}}
export function newer(current:State|null,next:State):State {
  if(current&&(next.revision<current.revision||next.revision===current.revision&&(Date.parse(next.serverTime)<Date.parse(current.serverTime)||current.submissionId===next.submissionId&&current.audioReceived&&!next.audioReceived)))return current;
  return current&&Date.parse(current.leaseUntil)>Date.parse(next.leaseUntil)?{...next,leaseUntil:current.leaseUntil}:next;
}
export function backendUrl(input:string):string {
  let u:URL;try{u=new URL(input.trim())}catch{return invalid()}
  const host=u.hostname, a=host.split('.').map(Number), privateIp=/^\d+\.\d+\.\d+\.\d+$/.test(host)&&a.every(v=>v>=0&&v<=255)&&(a[0]===10||a[0]===127||a[0]===192&&a[1]===168||a[0]===172&&a[1]>=16&&a[1]<=31);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.protocol==='http:'&&!privateIp&&host!=='localhost')return invalid();
  return u.origin;
}
