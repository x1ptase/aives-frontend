import { Redirect, router } from 'expo-router';
import { useAccount } from '../auth-context';
import { Schedule } from '../screens';
import { Loading } from '../ui';
export default function ExamsRoute(){
  const {account,loading,logout}=useAccount();if(loading)return <Loading/>;if(!account)return <Redirect href="/login"/>;
  return <Schedule api={account.api} auth={account.auth} onLogout={()=>void logout()} onExam={exam=>router.push({pathname:'/exam/[id]',params:{id:String(exam.id),title:exam.sessionTitle,subject:exam.subjectCode}})}/>;
}
