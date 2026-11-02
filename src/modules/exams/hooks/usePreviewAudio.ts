import { useCallback, useEffect, useRef, useState } from 'react'

/** Giọng đọc cục bộ cho bản mẫu; Gemini TTS sẽ được nối trong bước triển khai thật. */
export function usePreviewSpeech(text: string, language: 'vi' | 'en', enabled: boolean, playbackId: number, onEnd: (id: number) => void) {
  const [failure, setFailure] = useState({ key: '', message: '' })
  const [retryId, setRetryId] = useState(0)
  const key = `${playbackId}:${retryId}:${enabled}`
  const callback = useRef(onEnd)
  useEffect(() => { callback.current = onEnd }, [onEnd])
  useEffect(() => {
    if (!enabled) return
    const setIssue = (message: string) => setFailure({ key, message })
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setIssue('Thiết bị chưa hỗ trợ giọng đọc mẫu. Bạn vẫn có thể tiếp tục lượt nghe mô phỏng.')
      return
    }
    const synthesis = window.speechSynthesis
    let active = true
    let spoken = false
    let utterance: SpeechSynthesisUtterance | null = null
    let watchdog: number | undefined
    /** Chỉ dùng giọng phù hợp; không âm thầm đọc tiếng Việt bằng giọng tiếng Anh. */
    const speak = () => {
      if (!active || spoken) return
      const voice = synthesis.getVoices().find(item => item.localService && item.lang.toLowerCase().startsWith(language))
      if (!voice) { setIssue('Chưa có giọng đọc phù hợp trên thiết bị. Bạn có thể cài giọng Việt/Anh hoặc tiếp tục lượt nghe mô phỏng.'); return }
      spoken = true
      setIssue('')
      utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice; utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US'; utterance.rate = 0.95
      utterance.onend = () => { if (active) callback.current(playbackId) }
      utterance.onerror = () => { if (active) setIssue('Không phát được giọng đọc mẫu. Bấm thử phát lại hoặc tiếp tục mô phỏng.') }
      synthesis.speak(utterance)
      watchdog = window.setTimeout(() => { if (active) setIssue('Giọng đọc chưa hoàn tất. Bạn có thể thử phát lại hoặc tiếp tục lượt nghe mô phỏng.') }, 45000)
    }
    synthesis.addEventListener('voiceschanged', speak)
    speak()
    return () => {
      active = false
      synthesis.removeEventListener('voiceschanged', speak)
      window.clearTimeout(watchdog)
      if (utterance) { utterance.onend = null; utterance.onerror = null; synthesis.cancel() }
    }
  }, [text, language, enabled, playbackId, retryId, key])
  return { issue: failure.key === key ? failure.message : '', retry: () => setRetryId(value => value + 1) }
}

/** Thử quyền mic trong 3 giây, chỉ kiểm tra thiết bị; không ghi âm hoặc gửi audio. */
export function usePreviewMicrophone() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle')
  const [message, setMessage] = useState('Không cần quyền mic để thử luồng mô phỏng.')
  const requestId = useRef(0)
  const media = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const release = useCallback(() => {
    media.current?.getTracks().forEach(track => track.stop())
    media.current = null
    window.clearTimeout(timer.current)
  }, [])
  useEffect(() => () => { requestId.current += 1; release() }, [release])

  /** Chỉ yêu cầu quyền khi người dùng chủ động bấm; kết quả muộn luôn đóng track. */
  const check = async () => {
    if (status === 'checking') return
    const id = ++requestId.current
    release(); setStatus('checking'); setMessage('Đang kiểm tra mic; không ghi âm, không gửi dữ liệu.')
    timer.current = window.setTimeout(() => {
      if (requestId.current !== id) return
      requestId.current += 1; release(); setStatus('error'); setMessage('Chưa nhận được quyền mic. Bạn vẫn có thể thử mô phỏng.')
    }, 15000)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (requestId.current !== id) { stream.getTracks().forEach(track => track.stop()); return }
      window.clearTimeout(timer.current)
      media.current = stream
      setMessage('Đã mở được mic. Thiết bị sẽ được giải phóng sau 3 giây.')
      timer.current = window.setTimeout(() => {
        release(); setStatus('ready'); setMessage('Đã kiểm tra quyền mic và giải phóng thiết bị. Bản thử dùng transcript mẫu, chưa có STT.')
      }, 3000)
    } catch {
      if (requestId.current !== id) return
      release(); setStatus('error'); setMessage('Không mở được mic. Kiểm tra quyền trình duyệt và thiết bị; bạn vẫn có thể dùng bản mô phỏng.')
    }
  }
  return { status, message, check }
}
