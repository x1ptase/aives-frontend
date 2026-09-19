import { useState, useEffect, useRef, useCallback } from 'react'
import { WS_BASE_URL } from '@/config/constants'

interface UseWebSocketOptions {
  url?: string
  onMessage?: (data: unknown) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  autoConnect?: boolean
}

interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (data: unknown) => void
  connect: () => void
  disconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = WS_BASE_URL,
    onMessage,
    onOpen,
    onClose,
    onError,
    autoConnect = false,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      onOpen?.()
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessage?.(data)
    }

    ws.onclose = () => {
      setIsConnected(false)
      onClose?.()
    }

    ws.onerror = (error) => {
      onError?.(error)
    }
  }, [url, onMessage, onOpen, onClose, onError])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    return () => disconnect()
  }, [autoConnect, connect, disconnect])

  return { isConnected, sendMessage, connect, disconnect }
}
