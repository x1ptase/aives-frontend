import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../auth-context';
import { s } from '../ui';
export default function Layout(){return <AuthProvider><SafeAreaProvider><StatusBar style="dark"/><SafeAreaView style={s.root}><Stack screenOptions={{headerShown:false,gestureEnabled:false}}/></SafeAreaView></SafeAreaProvider></AuthProvider>}
