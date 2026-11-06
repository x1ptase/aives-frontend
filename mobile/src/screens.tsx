import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, KeyboardAvoidingView, PermissionsAndroid, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Api } from './api';
import { ApiError, countdown, errorText, terminal } from './contracts';
import type { Auth, Exam, Page } from './contracts';
import { audio } from './native';
import { clientFor, newId, scopeFor, secure } from './storage';
import { ExamSession } from './session';
import type { View as ExamView } from './session';
import { Button, colors, formatDate, formatTime, Loading, Note, Panel, s } from './ui';

const message=(e:unknown)=>e instanceof ApiError?e.message:'Chưa thực hiện được thao tác. Kiểm tra kết nối và thử lại.';
export function Login({onLogin}:{onLogin:(api:Api,auth:Auth)=>Promise<void>}){
  const [base,setBase]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
  useEffect(()=>{void secure.get('avies.base').then(v=>{if(v)setBase(v)})},[]);
  const submit=async()=>{if(busy)return;setBusy(true);setIssue('');try{const api=new Api(base),auth=await api.login(username,password);await secure.set('avies.base',api.base);await onLogin(api,auth);setPassword('')}catch(e){setIssue(message(e))}finally{setBusy(false)}};
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[s.scroll,{paddingTop:40}]} keyboardShouldPersistTaps="handled">
    <Text style={s.wordmark}>AVIES</Text><Text style={s.eyebrow}>STUDENT · ANDROID</Text><Text style={s.title}>Sẵn sàng cho lượt thi của bạn.</Text><Text style={s.muted}>Đăng nhập bằng tài khoản Student đã được giảng viên phân công.</Text>
    <Panel><Text style={s.h2}>Đăng nhập</Text>
      <Text style={s.label}>Địa chỉ Backend trên laptop</Text><TextInput accessibilityLabel="Địa chỉ Backend" style={s.input} value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.10:8080" editable={!busy}/>
      <Text style={s.muted}>Điện thoại và laptop dùng cùng Wi-Fi. Nhập IP LAN của laptop; localhost trên điện thoại không phải laptop.</Text>
      <Text style={s.label}>Tên đăng nhập</Text><TextInput accessibilityLabel="Tên đăng nhập" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy}/>
      <Text style={s.label}>Mật khẩu</Text><TextInput accessibilityLabel="Mật khẩu" style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" editable={!busy} onSubmitEditing={()=>void submit()}/>
      {!!issue&&<Note error text={issue}/>}<Button title={busy?'Đang đăng nhập…':'Đăng nhập'} disabled={busy||!base.trim()||!username.trim()||!password} onPress={()=>void submit()}/>
    </Panel><Note text="Bản thử nghiệm cài APK trực tiếp. Backend trên laptop cần bật; dịch vụ AI vẫn cần Internet và còn hạn mức miễn phí."/>
  </ScrollView></KeyboardAvoidingView>;
}
const statusText={ASSIGNED:'Chưa thi',IN_PROGRESS:'Đang thi',COMPLETED:'Đã hoàn thành',EXPIRED:'Hết giờ — chưa hoàn thành',ABSENT:'Vắng thi'};
export function Schedule({api,auth,onExam,onLogout}:{api:Api;auth:Auth;onExam:(e:Exam)=>void;onLogout:()=>void}){
  const [page,setPage]=useState(0),[data,setData]=useState<Page|null>(null),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false);
  const generation=useRef(0);
  const load=useCallback(async(p:number)=>{const serial=++generation.current;setBusy(true);setIssue('');try{const next=await api.list(p);if(serial===generation.current)setData(next)}catch(e){if(serial===generation.current)setIssue(message(e))}finally{if(serial===generation.current)setBusy(false)}},[api]);
  const invalidate=useCallback(()=>{generation.current++},[]);
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void load(page)});return()=>{active=false;invalidate()}},[page,load,invalidate]);
  return <><View style={s.header}><Text style={s.wordmark}>AVIES</Text><Text style={s.muted}>{auth.fullName} · Student</Text></View>
    <ScrollView contentContainerStyle={s.scroll}><Text style={s.title}>Lịch thi của bạn</Text><View style={s.row}><Text style={s.muted}>{data?`${data.totalElements} lượt được phân công`:'Lịch do giảng viên phân công'}</Text><Button title="Tải lại" secondary disabled={busy} onPress={()=>void load(page)}/></View>
      {!!issue&&<Note error text={issue}/>} {busy&&!data&&<Loading/>}
      {data?.items.map(e=><Panel key={e.id}><Text style={s.eyebrow}>{e.subjectCode} · SLOT {e.slotOrder??'—'}</Text><Text style={s.h2}>{e.sessionTitle}</Text><Text style={s.muted}>{e.subjectName}</Text><View style={s.divider}/><Text style={s.body}>{formatDate(e.scheduledStartAt)}</Text><Text style={s.muted}>Đến {formatDate(e.scheduledEndAt)}</Text><Text style={s.badge}>{statusText[e.status]}</Text>
        <Button title={e.status==='ASSIGNED'?'Chuẩn bị thi':e.status==='IN_PROGRESS'?'Tiếp tục lượt thi':'Xem tiến trình'} secondary={e.status!=='ASSIGNED'} disabled={e.status==='ABSENT'} onPress={()=>onExam(e)}/>
      </Panel>)}
      {data&&!data.items.length&&<Note text="Bạn chưa có lượt thi trong trang này."/>}
      <View style={s.row}><Button title="Trang trước" secondary disabled={busy||page===0} onPress={()=>setPage(p=>p-1)}/><Text style={s.muted}>{data&&data.totalPages?`${page+1}/${data.totalPages}`:'0/0'}</Text><Button title="Trang sau" secondary disabled={busy||!data||page+1>=data.totalPages} onPress={()=>setPage(p=>p+1)}/></View>
      <Button title="Đăng xuất" secondary onPress={onLogout}/>
    </ScrollView></>;
}
const phaseText={PREPARING:'Đang chuẩn bị câu hỏi',SPEAKING:'Lắng nghe câu hỏi',ANSWERING:'Đến lượt bạn trả lời',TRANSCRIBING:'Đang xác nhận bản ghi',DECIDING:'Đang chuẩn bị lượt tiếp theo',REVIEW:'Còn câu đã tạm bỏ qua',PAUSED:'Lượt thi đang tạm dừng',TECHNICAL_ERROR:'Lượt xử lý gặp lỗi kỹ thuật',COMPLETED:'Đã hoàn thành lượt thi',EXPIRED:'Lượt thi đã hết giờ'};
const questionStatus={PENDING:'Chưa đến lượt',ACTIVE:'Đang thực hiện',DEFERRED:'Tạm bỏ qua',ANSWERED:'Đã trả lời',NO_ANSWER:'Không có câu trả lời',TECHNICAL_ERROR:'Lỗi kỹ thuật'};
export function Room({api,user,exam,onBack}:{api:Api;user:string;exam:Pick<Exam,'id'|'sessionTitle'|'subjectCode'>;onBack:()=>void}){
  useKeepAwake('avies-oral-room',{suppressDeactivateWarnings:true});
  const [session,setSession]=useState<ExamSession|null>(null),[view,setView]=useState<ExamView|null>(null),[clock,setClock]=useState(()=>performance.now()),[setupIssue,setSetupIssue]=useState('');
  const leaving=useRef(false);
  useEffect(()=>{
    let current:ExamSession|null=null,disposed=false;
    void (async()=>{try{const scope=await scopeFor(api.base,user,exam.id),client=await clientFor(scope);if(disposed)return;current=new ExamSession(exam.id,client,scope,api,audio,secure,newId,v=>{if(!disposed)setView(v)});setSession(current);setView(current.view);await current.init()}catch(e){if(!disposed)setSetupIssue(message(e))}})();
    const audioListener=audio.addListener('audioEvent',e=>current?.onAudio(e));
    const appListener=AppState.addEventListener('change',state=>{void current?.foreground(state==='active')});
    const timer=setInterval(()=>{if(!disposed){setClock(performance.now());void current?.tick()}},500);
    let polling=false;const poll=setInterval(()=>{if(current&&!polling){polling=true;void current.refresh().finally(()=>{polling=false})}},2000);
    const heartbeat=setInterval(()=>void current?.heartbeat(),10000);
    return()=>{disposed=true;audioListener.remove();appListener.remove();clearInterval(timer);clearInterval(poll);clearInterval(heartbeat);void current?.dispose()};
  },[api,user,exam.id]);
  const leave=useCallback(()=>{if(leaving.current)return;if(view?.state&&!terminal(view.state)){Alert.alert('Rời phòng thi?','Micro và giọng đọc sẽ dừng. Thời hạn lượt thi vẫn giữ nguyên. Bản ghi chưa xác nhận được giữ trên thiết bị.',[{text:'Ở lại',style:'cancel'},{text:'Về lịch thi',onPress:()=>{leaving.current=true;void session?.dispose().finally(onBack)}}])}else onBack()},[view,session,onBack]);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{leave();return true});return()=>sub.remove()},[leave]);
  useEffect(()=>{if(view?.controlled&&!view.busy&&view.mic==='idle'&&view.speech==='idle'&&view.state&&['PREPARING','SPEAKING'].includes(view.state.phase))void session?.listen(true)},[session,view]);
  const ensureMicrophone=async()=>{try{const permission=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,{title:'Cho phép AVIES dùng microphone',message:'Âm thanh được gửi tới Backend để nhận dạng câu trả lời trong lượt thi.',buttonPositive:'Cho phép',buttonNegative:'Hủy'});if(permission!==PermissionsAndroid.RESULTS.GRANTED){setSetupIssue(errorText(9004));return false}setSetupIssue('');return true}catch{setSetupIssue(errorText(9004));return false}};
  const record=async()=>{if(await ensureMicrophone())await session?.record()};
  const start=async()=>{if(await ensureMicrophone())await session?.open()};
  const state=view?.state,t=state&&view?countdown(state,clock-view.receivedAt):null,done=state?terminal(state):false;
  const blocked=!session||!view||view.busy||!view.controlled||done;
  const canAct=!blocked&&view?.mic==='idle';
  return <><View style={s.header}><Text style={s.wordmark}>AVIES</Text><Text style={s.muted} numberOfLines={1}>{exam.subjectCode} · {exam.sessionTitle}</Text></View><ScrollView contentContainerStyle={s.scroll}>
    <Button title="Về lịch thi" secondary onPress={leave}/>
    {!!setupIssue&&<Note error text={setupIssue}/>} {!!view?.issue&&<Note error text={view.issue}/>}
    {!view||view.loading?<Loading/>:!state?<Panel><Text style={s.eyebrow}>CHUẨN BỊ VÀO PHÒNG THI</Text><Text style={s.title}>Bắt đầu đúng lượt đã được phân công</Text><Text style={s.body}>Hãy dùng tai nghe, chọn nơi yên tĩnh và giữ ứng dụng trên màn hình trong lúc thi. Câu hỏi được đọc lần lượt; câu trả lời của bạn sẽ được lưu thành transcript.</Text><Note text="Bản demo hỗ trợ một Student dùng STT tại một thời điểm. Không mở đồng thời lượt thi trên web."/><Button title="Bắt đầu lượt thi" disabled={view.busy||!view.runtime?.providersReady||!view.runtime.streamingSttReady||!view.runtime.streamingTtsReady} onPress={()=>void start()}/></Panel>:<>
      <Panel><View style={s.row}><View><Text style={s.eyebrow}>LƯỢT THI #{exam.id}</Text><Text style={s.muted}>{state.mainCount} câu chính · Tối đa {state.maxFollowUps} follow-up</Text></View></View><Text style={s.muted}>{done?'Thời gian còn khi chốt kết quả':'Thời gian lượt thi còn lại'}</Text><Text style={[s.timer,t&&t.slot<60000&&!done&&{color:colors.red}]}>{formatTime(t?.slot??0)}</Text></Panel>
      {!view.controlled&&!done&&<Panel><Text style={s.body}>Tiến trình đã lưu. Nhận lại quyền để tiếp tục trên điện thoại này.</Text><Button title="Tiếp tục / nhận lại quyền" disabled={view.busy} onPress={()=>void start()}/></Panel>}
      {view.draft&&<Panel><Text style={s.h2}>Bản ghi đang chờ xác nhận</Text><Text style={s.muted}>Bản ghi được giữ riêng trên điện thoại. Kiểm tra Backend trước khi gửi lại đúng lượt này.</Text><Button title="Đối soát và gửi lại bản ghi" disabled={blocked} onPress={()=>void session?.recover()}/><Button title="Bỏ bản ghi chưa nộp" secondary disabled={blocked||!!view.pending} onPress={()=>Alert.alert('Bỏ bản ghi local?','Thao tác này không xóa câu trả lời đã được Backend nhận.',[{text:'Giữ lại',style:'cancel'},{text:'Bỏ bản ghi',style:'destructive',onPress:()=>void session?.discard()}])}/></Panel>}
      {view.pending&&!view.draft&&<Panel><Text style={s.body}>Có thao tác chưa rõ kết quả. Giữ nguyên yêu cầu để thử lại an toàn.</Text><Button title="Đối soát thao tác đang chờ" disabled={!view.controlled||view.busy} onPress={()=>void session?.retryPending()}/></Panel>}
      <Panel><Text style={s.eyebrow}>{state.currentQuestionOrder?`CÂU CHÍNH ${state.currentQuestionOrder}/${state.mainCount}${state.followUpIndex?` · FOLLOW-UP ${state.followUpIndex}`:''}`:'KẾT QUẢ THỰC HIỆN'}</Text>
        <Text style={s.title}>{phaseText[state.phase]}</Text><Text style={s.muted}>{state.language==='vi'?'Tiếng Việt':state.language==='en'?'English':''}</Text>
        {['PREPARING','SPEAKING'].includes(state.phase)&&<><Text style={s.body}>{view.speech==='playing'?'AI đang đọc câu hỏi…':view.speech==='loading'?'Đang nhận giọng đọc…':'Micro chưa bật. Thời gian trả lời bắt đầu khi nghe xong.'}</Text><Button title="Nghe câu hỏi" disabled={blocked||view.speech!=='idle'||view.mic!=='idle'} onPress={()=>void session?.listen()}/></>}
        {state.phase==='ANSWERING'&&<>
          <Text style={s.body}>{view.mic==='connecting'?'Đang kết nối microphone…':view.mic==='recording'?'Đang ghi âm. Bấm Trả lời xong để nộp.':view.mic==='submitting'?'Đang gửi bản ghi…':'Bấm Bật microphone để bắt đầu trả lời.'}</Text>
          {view.mic==='recording'?<Button title="Trả lời xong" disabled={view.busy} onPress={()=>void session?.submit()}/>:<Button title="Bật microphone và trả lời" disabled={blocked||view.mic!=='idle'||!!view.draft||!!view.pending} onPress={()=>void record()}/>}
          {!!view.interim&&<Note text={`Transcript tạm · chưa nộp\n${view.interim}`}/>}
          <Button title="Hiển thị câu hỏi dạng text" secondary disabled={blocked} onPress={()=>void session?.question()}/>
          {!!view.question&&<Text selectable style={s.body}>{view.question}</Text>}
          <Button title="Nghe lại câu hỏi" secondary disabled={!canAct||!!view.draft||!!view.pending} onPress={()=>void session?.command('REPLAY')}/>
          {state.followUpIndex===0&&!state.transcripts.some(v=>v.questionOrder===state.currentQuestionOrder&&v.followUpIndex===0)&&<Button title="Tạm bỏ qua" secondary disabled={!canAct||!!view.draft||!!view.pending} onPress={()=>void session?.command('DEFER')}/>}
        </>}
        {['TRANSCRIBING','DECIDING'].includes(state.phase)&&<Loading text="Giữ kết nối trong lúc hệ thống xử lý câu trả lời."/>}
        {!!state.processingErrorCode&&state.phase==='TECHNICAL_ERROR'&&<Note error text={errorText(state.processingErrorCode)}/>}
        {state.phase==='TECHNICAL_ERROR'&&<Button title="Thử lại lượt xử lý" disabled={!canAct||!!view.pending} onPress={()=>void session?.command('RETRY')}/>}
        {state.phase==='PAUSED'&&<Button title="Tiếp tục câu hiện tại" disabled={!canAct||!!view.pending} onPress={()=>void session?.command('RESUME')}/>}
        {['ANSWERING','SPEAKING'].includes(state.phase)&&<Button title="Tạm dừng" secondary disabled={!canAct||!!view.pending||!!view.draft} onPress={()=>void session?.command('PAUSE')}/>}
        {state.phase==='REVIEW'&&<><Text style={s.body}>Bạn có thể quay lại câu đã bỏ qua nếu còn thời gian.</Text><Button title="Kết thúc bài thi" secondary disabled={!canAct||!!view.pending} onPress={()=>Alert.alert('Kết thúc bài thi?','Các câu chưa trả lời sẽ được Backend chốt theo quy tắc hiện tại.',[{text:'Quay lại',style:'cancel'},{text:'Kết thúc',onPress:()=>void session?.command('FINISH')}])}/></>}
        {done&&<Text style={s.body}>{state.phase==='COMPLETED'?'Backend đã xác nhận hoàn thành lượt thi.':'Đã hết thời gian cho phép. Backend giữ các câu trả lời đã nhận.'} Màn hình này không tự tạo điểm hoặc nhận xét chấm bài.</Text>}
        {!done&&<><View style={s.divider}/><Text style={s.muted}>Thời gian trả lời câu chính và follow-up còn lại</Text><Text style={s.h2}>{formatTime(t?.answer??null)}</Text></>}
      </Panel>
      <Panel><Text style={s.h2}>Tiến độ bài thi</Text>{state.questions.map(q=><View key={q.questionOrder} style={s.item}><Text style={s.body}>Câu chính {q.questionOrder}</Text><Text style={s.muted}>{questionStatus[q.status]}</Text>{state.phase==='REVIEW'&&q.status==='DEFERRED'&&<Button title="Quay lại câu này" secondary disabled={!canAct||!!view.pending} onPress={()=>void session?.command('REVISIT',q.questionOrder)}/>}</View>)}<Text style={s.body}>Follow-up: {state.followUpsUsed}/{state.maxFollowUps}</Text></Panel>
      <Panel><Text style={s.h2}>Transcript câu trả lời của bạn</Text><Text style={s.muted}>Chỉ đọc · đã được Backend lưu</Text>{!state.transcripts.length?<Text style={s.muted}>Chưa có câu trả lời được xác nhận.</Text>:state.transcripts.map(tr=><View style={s.item} key={`${tr.questionOrder}:${tr.followUpIndex}`}><Text style={s.eyebrow}>CÂU CHÍNH {tr.questionOrder}{tr.followUpIndex?` · FOLLOW-UP ${tr.followUpIndex}`:''}</Text><Text selectable style={s.body}>{tr.content}</Text><Text style={s.muted}>{formatDate(tr.savedAt)}</Text></View>)}</Panel>
    </>}
    <Button title="Cập nhật tiến trình" secondary disabled={view?.busy} onPress={()=>void session?.refresh()}/>
  </ScrollView></>;
}
