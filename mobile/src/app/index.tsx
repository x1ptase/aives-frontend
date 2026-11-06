import { Redirect } from 'expo-router';
import { useAccount } from '../auth-context';
import { Loading } from '../ui';
export default function Index(){const {account,loading}=useAccount();return loading?<Loading/>:<Redirect href={account?'/exams':'/login'}/>}
