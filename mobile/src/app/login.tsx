import { Redirect } from 'expo-router';
import { useAccount } from '../auth-context';
import { Login } from '../screens';
import { Loading } from '../ui';
export default function LoginRoute(){const {account,loading,login}=useAccount();return loading?<Loading/>:account?<Redirect href="/exams"/>:<Login onLogin={login}/>}
