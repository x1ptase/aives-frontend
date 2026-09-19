import { WS_BASE_URL } from '@/config/constants'

type MessageHandler = (data: unknown) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private messageHandlers: Map<string, MessageHandler> = new Map()

  connect(path: string = '/exam'): void {
    const url = `${WS_BASE_URL}${path}`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const handler = this.messageHandlers.get(data.type)
      handler?.(data.payload)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
  }

  on(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler)
  }

  off(type: string): void {
    this.messageHandlers.delete(type)
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  sendAudioChunk(chunk: Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk)
    }
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
    this.messageHandlers.clear()
  }
}

export const wsService = new WebSocketService()
