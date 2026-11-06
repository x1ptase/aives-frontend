import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useAccount } from '../../auth-context';
import { Room } from '../../screens';
import { Loading } from '../../ui';
export default function ExamRoute(){
  const {account,loading}=useAccount(),params=useLocalSearchParams<{id:string;title?:string;subject?:string}>();
  if(loading)return <Loading/>;if(!account)return <Redirect href="/login"/>;
  const id=Number(params.id);if(!Number.isSafeInteger(id)||id<1)return <Redirect href="/exams"/>;
  return <Room key={`${account.auth.username}:${id}`} api={account.api} user={account.auth.username}
    exam={{id,sessionTitle:typeof params.title==='string'?params.title.slice(0,1000):`Lượt thi #${id}`,subjectCode:typeof params.subject==='string'?params.subject.slice(0,100):'AVIES'}} onBack={()=>router.replace('/exams')}/>;
}
