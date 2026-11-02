import { Capacitor } from '@capacitor/core'

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  (Capacitor.isNativePlatform() ? 'ws://10.0.2.2:8000/ws' : 'ws://localhost:8000/ws')
