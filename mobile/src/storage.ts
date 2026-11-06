import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { ApiError, uuid, validateCommand } from './contracts';
import type { Auth, Command } from './contracts';

export interface Store { get(key:string):Promise<string|null>; set(key:string,value:string|null):Promise<void> }
export const secure:Store={get:key=>SecureStore.getItemAsync(key),set:(key,value)=>value===null?SecureStore.deleteItemAsync(key):SecureStore.setItemAsync(key,value)};
export const newId=()=>Crypto.randomUUID();
export const scopeFor=(base:string,user:string,id:number)=>Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,JSON.stringify([base,user,id]));
export async function clientFor(scope:string){
  const key=`client.${scope}`,saved=await secure.get(key);if(uuid(saved))return saved;
  const client=newId();await secure.set(key,client);return client;
}
export async function restoreAuth():Promise<{base:string;auth:Auth}|null>{
  const saved=await secure.get('avies.auth');if(!saved)return null;
  try{const v=JSON.parse(saved);if(typeof v.base!=='string'||typeof v.auth?.token!=='string'||typeof v.auth?.username!=='string'||typeof v.auth?.fullName!=='string')throw 0;return v}catch{await secure.set('avies.auth',null);return null}
}
export async function pendingFor(scope:string):Promise<Command|null>{
  const saved=await secure.get(`pending.${scope}`);if(!saved)return null;
  try{const c=JSON.parse(saved);validateCommand(c);return c}catch{throw new ApiError(9006)}
}
