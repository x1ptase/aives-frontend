import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export const colors={ink:'#15283F',muted:'#60738B',blue:'#245FEA',line:'#E2E8F0',canvas:'#F3F6FA',white:'#FFFFFF',red:'#AE303B',green:'#176951'};
export function Button({title,onPress,disabled=false,secondary=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[s.button,secondary?s.secondary:{backgroundColor:danger?colors.red:colors.blue},disabled&&{opacity:.4},pressed&&{opacity:.75}]}>
    <Text style={[s.buttonText,secondary&&{color:danger?colors.red:colors.ink}]}>{title}</Text>
  </Pressable>;
}
export function Panel({children}:{children:React.ReactNode}){return <View style={s.panel}>{children}</View>}
export function Note({text,error=false}:{text:string;error?:boolean}){return <Text accessibilityRole={error?'alert':undefined} style={[s.note,error&&{color:colors.red,backgroundColor:'#FFF0F1'}]}>{text}</Text>}
export function Loading({text='Đang tải…'}:{text?:string}){return <View style={s.loading}><ActivityIndicator color={colors.blue}/><Text style={s.muted}>{text}</Text></View>}
export const formatTime=(v:number|null)=>v===null?'Theo giờ lượt thi':`${Math.floor(v/60000).toString().padStart(2,'0')}:${Math.floor(v%60000/1000).toString().padStart(2,'0')}`;
export const formatDate=(v:string|null)=>v?new Date(v).toLocaleString('vi-VN'):'Chưa xếp lịch';
export const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.canvas},scroll:{padding:20,gap:16,paddingBottom:36},header:{paddingHorizontal:20,paddingTop:16,paddingBottom:16,backgroundColor:colors.white,borderBottomWidth:1,borderBottomColor:colors.line,gap:5},
  wordmark:{fontSize:16,fontWeight:'800',letterSpacing:2,color:colors.blue},eyebrow:{fontSize:11,letterSpacing:1.3,fontWeight:'700',color:colors.blue},title:{fontSize:27,lineHeight:34,fontWeight:'700',color:colors.ink},h2:{fontSize:19,lineHeight:26,fontWeight:'700',color:colors.ink},body:{fontSize:15,lineHeight:24,color:colors.ink},muted:{fontSize:13,lineHeight:21,color:colors.muted},
  panel:{padding:20,backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,borderRadius:12,gap:14},label:{fontSize:13,fontWeight:'600',color:colors.ink},input:{minHeight:50,borderWidth:1,borderColor:'#C9D4E3',borderRadius:8,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:colors.ink,backgroundColor:colors.white},
  button:{minHeight:50,paddingVertical:13,paddingHorizontal:18,borderRadius:8,alignItems:'center',justifyContent:'center'},buttonText:{color:colors.white,fontSize:15,lineHeight:22,fontWeight:'700',textAlign:'center'},secondary:{backgroundColor:colors.white,borderColor:'#C9D4E3',borderWidth:1},note:{padding:14,borderRadius:8,fontSize:13,lineHeight:21,color:colors.muted,backgroundColor:'#EDF2F9'},loading:{padding:24,alignItems:'center',gap:12},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},divider:{height:1,backgroundColor:colors.line},timer:{fontVariant:['tabular-nums'],fontSize:29,fontWeight:'700',color:colors.ink},badge:{fontSize:12,color:colors.green,fontWeight:'700'},item:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:colors.line,gap:7},
});
