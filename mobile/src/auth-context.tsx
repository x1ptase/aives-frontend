import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Api } from './api';
import type { Auth } from './contracts';
import { restoreAuth, secure } from './storage';
type Account={api:Api;auth:Auth};
const Context=createContext<{account:Account|null;loading:boolean;login:(api:Api,auth:Auth)=>Promise<void>;logout:()=>Promise<void>}|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
  const [account,setAccount]=useState<Account|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{void restoreAuth().then(saved=>{if(saved){const api=new Api(saved.base);api.token=saved.auth.token;setAccount({api,auth:saved.auth})}}).catch(()=>{}).finally(()=>setLoading(false))},[]);
  const login=async(api:Api,auth:Auth)=>{await secure.set('avies.auth',JSON.stringify({base:api.base,auth}));setAccount({api,auth})};
  const logout=async()=>{try{await account?.api.logout()}catch{/* Clear local auth even offline. */}await secure.set('avies.auth',null);setAccount(null)};
  return <Context.Provider value={{account,loading,login,logout}}>{children}</Context.Provider>;
}
export function useAccount(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value}
