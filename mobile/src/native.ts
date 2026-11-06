import { requireNativeModule } from 'expo';
export interface AudioEvent { operation:string; kind:'ready'|'socket'|'error'|'closed'|'interrupted'|'limit'|'playing'; payload:string; code:number }
export interface AudioNative {
  addListener(name:'audioEvent',listener:(event:AudioEvent)=>void):{remove():void};
  connect(operation:string,base:string,token:string,id:number,request:string,scope:string,command:string):Promise<void>;
  finish(operation:string,command:string):Promise<void>;
  disconnect(operation:string):Promise<void>;
  readDraft(scope:string):Promise<string|null>;
  deleteDraft(scope:string):Promise<void>;
  reserveDraft(scope:string,command:string):Promise<void>;
  uploadDraft(base:string,token:string,id:number,submission:string,metadata:string,scope:string):Promise<string>;
  speak(operation:string,base:string,token:string,id:number,request:string):Promise<void>;
  stopSpeech():void;
}
export const audio=requireNativeModule<AudioNative>('OralAudio');
