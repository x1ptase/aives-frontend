import { useCallback, useEffect, useRef, useState } from 'react'
import axiosInstance from '@/shared/api/axios'
import { useFeedback } from '@/shared/components/common/feedback'
import { oralApi, isLocalOralDemo, type OralAction, type OralCommand, type OralDemoScenario, type OralRuntime, type OralState } from '../oralApi'
import { oralError, oralErrorCode, oralTerminal, uncertainOralWrite } from '../components/oralExamHelpers'
import { loadOralClient, loadOralPending, newOralId, oralSessionKey, saveOralPending } from '../components/oralExamSession'
import { loadAudioDraft, saveAudioDraft, type OralAudioDraft } from '../components/oralAudioDraft'

/** Nối tiến trình thật: chỉ BE quyết định chuyển bước, trình duyệt giữ receipt để retry an toàn. */
export function useOralExam(examId: number, userId: string) {
  const key = oralSessionKey(userId, examId, axiosInstance.defaults.baseURL || '')
  const [identity, setIdentity] = useState(() => loadOralClient(key))
  const [pending, setPending] = useState<OralCommand | null>(() => loadOralPending(key, identity.id))
  const [state, setState] = useState<OralState | null>(null)
  const [runtime, setRuntime] = useState<OralRuntime | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [audioDraft, setAudioDraft] = useState<OralAudioDraft | null>(null), [uploading, setUploading] = useState(false)
  const draftRef = useRef<OralAudioDraft | null>(null), uploadLock = useRef(false)
  const draftKey = `${key}:${identity.id}`
  const [controlled, setControlled] = useState(false)
  const [issue, setIssue] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => performance.now())
  const lastReceived = useRef(0)
  const [storageWarning, setStorageWarning] = useState(!identity.storageAvailable)
  const feedback = useFeedback()
  const alive = useRef(false)
  const current = useRef<OralState | null>(null)
  const pendingRef = useRef(pending)
  const controlledRef = useRef(false)
  const leaseLost = useRef(false)
  const inFlight = useRef(false)
  const queuedWrite = useRef(false)
  const controllers = useRef(new Set<AbortController>())
  const leaseInFlight = useRef(false), lastWriteFailure = useRef<number | undefined>(undefined), lastWriteMessage = useRef('')

  /** Nhận state chỉ từ response đã được parse, không suy diễn sau một thao tác ghi. */
  const apply = useCallback((next: OralState) => {
    if (current.current && (next.revision < current.current.revision || next.revision === current.current.revision && Date.parse(next.serverTime) < Date.parse(current.current.serverTime))) return
    if (current.current && next.revision === current.current.revision && next.submissionId === current.current.submissionId && current.current.audioReceived && !next.audioReceived) return
    if (current.current && Date.parse(current.current.leaseUntil) > Date.parse(next.leaseUntil)) next = { ...next, leaseUntil: current.current.leaseUntil }
    current.current = next
    lastReceived.current = performance.now()
    if (alive.current) {
      setState(next); setReceivedAt(performance.now())
      if (oralTerminal(next)) { leaseLost.current = false; controlledRef.current = false; setControlled(false) }
      if (!leaseLost.current) setIssue('')
    }
  }, [])
  /** Thao tác đã biết kết quả mới xóa payload; không tự retry với requestId mới. */
  const remember = useCallback((command: OralCommand | null) => {
    pendingRef.current = command
    const saved = saveOralPending(key, command)
    if (alive.current) { setPending(command); if (!saved) setStorageWarning(true) }
  }, [key])
  /** Poll được tuần tự với lệnh ghi để tránh tự gây xung đột khóa PostgreSQL. */
  const refresh = useCallback(async () => {
    if (inFlight.current || queuedWrite.current || !alive.current) return
    inFlight.current = true
    const controller = new AbortController(); controllers.current.add(controller)
    try {
      const next = await oralApi.get(examId, controller.signal)
      if (!controller.signal.aborted) apply(next)
    } catch (cause) {
      if (!controller.signal.aborted && alive.current) {
        if (oralErrorCode(cause) === 1800) { current.current = null; setState(null); remember(null); setIssue('') }
        // Worker có thể đang giữ khóa trong một transaction ngắn; poll kế tiếp đọc lại.
        else if (oralErrorCode(cause) !== 1303) setIssue(oralError(cause))
      }
    } finally { controllers.current.delete(controller); inFlight.current = false; if (alive.current) setLoading(false) }
  }, [examId, apply, remember])

  /** Một yêu cầu ghi tại một thời điểm, cùng payload được giữ cả khi response không tới. */
  const send = useCallback(async (command: OralCommand, quiet = false, scenario?: { value: OralDemoScenario; runtime: OralRuntime }) => {
    if (queuedWrite.current || !alive.current) return false
    queuedWrite.current = true; setBusy(true); remember(command); lastWriteFailure.current = undefined; lastWriteMessage.current = ''
    let ok = false
    let locked = false
    let sent = false
    try {
      // Không bỏ mất click khi một GET ngắn đang chạy; giữ nguyên turn/revision người dùng đã thấy.
      while (inFlight.current && alive.current) await new Promise(resolve => window.setTimeout(resolve, 20))
      if (!alive.current) return false
      inFlight.current = true; locked = true
      if (scenario && command.turnId) await oralApi.chooseDemoScenario(examId, command.turnId, scenario.value, scenario.runtime)
      sent = true
      const next = await oralApi.action(examId, command)
      remember(null); leaseLost.current = false; apply(next); ok = true
      controlledRef.current = !oralTerminal(next)
      if (alive.current) setControlled(!oralTerminal(next))
    } catch (cause) {
      lastWriteFailure.current = oralErrorCode(cause)
      lastWriteMessage.current = oralError(cause)
      if (!sent || !uncertainOralWrite(cause)) remember(null)
      if (oralErrorCode(cause) === 1803) { controlledRef.current = false; if (alive.current) setControlled(false) }
      if (alive.current) {
        const message = oralError(cause); setIssue(message)
        if (!quiet) feedback.notify({ title: 'Chưa thể thực hiện thao tác', message, tone: 'error' })
      }
    } finally { if (locked) inFlight.current = false; queuedWrite.current = false; if (alive.current) setBusy(false) }
    if (!ok) await refresh()
    return ok
  }, [examId, remember, apply, refresh, feedback])

  /** Lease có đường riêng: GET/TTS/STT chậm không được làm mất heartbeat hoặc tạo pending nghiệp vụ. */
  const heartbeat = useCallback(async () => {
    if (!alive.current || leaseInFlight.current || !controlledRef.current || !current.current || oralTerminal(current.current) || document.visibilityState === 'hidden') return
    leaseInFlight.current = true
    const controller = new AbortController(); controllers.current.add(controller)
    try {
      const lease = await oralApi.renewLease(examId, identity.id, controller.signal)
      if (lease.terminal && !controller.signal.aborted && alive.current) {
        const next = await oralApi.get(examId, controller.signal)
        if (!controller.signal.aborted && alive.current) apply(next)
        return
      }
      if (!controller.signal.aborted && alive.current && current.current && !oralTerminal(current.current)
        && lease.leaseUntil && Date.parse(lease.leaseUntil) > Date.parse(current.current.leaseUntil)) {
        const next = { ...current.current, leaseUntil: lease.leaseUntil }; current.current = next; setState(next)
      }
    } catch (cause) {
      if (!controller.signal.aborted && alive.current && current.current && !oralTerminal(current.current) && oralErrorCode(cause) === 1803) {
        // Có thể bài vừa kết thúc sau khi heartbeat được gửi; đọc kết quả trước khi báo tab khác.
        try {
          const next = await oralApi.get(examId, controller.signal)
          if (!controller.signal.aborted && alive.current) {
            apply(next)
            if (current.current && !oralTerminal(current.current)) { leaseLost.current = true; controlledRef.current = false; setControlled(false); setIssue(oralError(cause)) }
          }
        } catch { /* Chưa đọc được trạng thái thật: tick sau thử lại, không suy diễn mất quyền. */ }
      }
      // Mạng/khóa tạm thời: tick sau thử lại, không chặn SUBMIT bằng một pending heartbeat.
    } finally { controllers.current.delete(controller); leaseInFlight.current = false }
  }, [examId, identity.id, apply])

  /** Người dùng chủ động bắt đầu/nhận lại quyền; không POST Start khi mount hoặc chỉ xem lịch. */
  const open = async () => {
    if (queuedWrite.current || pendingRef.current && pendingRef.current.action !== 'SUBMIT' || !alive.current) return
    if (!current.current && !runtime?.providersReady) return
    queuedWrite.current = true; setBusy(true)
    let locked = false
    let replay: OralCommand | null = null
    try {
      while (inFlight.current && alive.current) await new Promise(resolve => window.setTimeout(resolve, 20))
      if (!alive.current) return
      inFlight.current = true; locked = true
      const next = await oralApi.open(examId, identity.id)
      leaseLost.current = false; apply(next); controlledRef.current = !oralTerminal(next); if (alive.current) setControlled(!oralTerminal(next))
      if (next.phase === 'ANSWERING' && !draftRef.current && !pendingRef.current) replay = { requestId: newOralId(), clientSessionId: identity.id, expectedRevision: next.revision, turnId: next.currentTurnId, action: 'REPLAY' }
    } catch (cause) {
      controlledRef.current = false
      if (alive.current) {
        setControlled(false); const message = oralError(cause); setIssue(message)
        feedback.notify({ title: 'Không thể mở phòng thi', message, tone: 'error' })
      }
    } finally { if (locked) inFlight.current = false; queuedWrite.current = false; if (alive.current) setBusy(false) }
    if (replay && alive.current) await send(replay)
  }

  /** Chỉ SUBMIT ở demo cục bộ mới chọn tình huống fixture; production không gửi transcript mẫu. */
  const command = async (action: OralAction, targetQuestionOrder?: number, scenario?: OralDemoScenario) => {
    const next = current.current
    if (!next || queuedWrite.current || pendingRef.current || !controlledRef.current || oralTerminal(next)) return
    await send({ requestId: newOralId(), clientSessionId: identity.id, expectedRevision: next.revision, turnId: next.currentTurnId, action,
      ...(action === 'REVISIT' ? { targetQuestionOrder } : {}) }, false,
      action === 'SUBMIT' && scenario && isLocalOralDemo(runtime) ? { value: scenario, runtime: runtime! } : undefined)
  }

  useEffect(() => {
    alive.current = true
    const aborters = controllers.current
    const controller = new AbortController(); aborters.add(controller)
    oralApi.runtime(controller.signal).then(value => { if (!controller.signal.aborted) setRuntime(value) })
      .catch(cause => { if (!controller.signal.aborted) setIssue(oralError(cause)) })
    queueMicrotask(() => { if (alive.current) void refresh() })
    let poll: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (!current.current || !oralTerminal(current.current)) await refresh()
      // Chỉ đọc nhanh lúc chờ worker; vẫn chờ GET trước kết thúc, không gây request chồng nhau.
      if (alive.current) poll = window.setTimeout(tick, current.current && ['TRANSCRIBING', 'DECIDING', 'PREPARING'].includes(current.current.phase) ? 800 : 3000)
    }
    poll = window.setTimeout(tick, 3000)
    const leaseTimer = window.setInterval(() => void heartbeat(), 10000)
    return () => { alive.current = false; aborters.forEach(item => item.abort()); aborters.clear(); window.clearTimeout(poll); window.clearInterval(leaseTimer) }
  }, [identity.id, refresh, heartbeat])

  /** Tab được nhân bản có thể sao chép sessionStorage; peer đang sống buộc bản sao lấy UUID riêng. */
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    const instance = newOralId(); const channel = new BroadcastChannel(key); let replaced = false
    channel.onmessage = event => {
      const message = event.data
      if (!message || message.client !== identity.id || message.instance === instance) return
      if (message.type === 'PROBE') channel.postMessage({ type: 'OWNER', client: identity.id, instance })
      else if (message.type === 'OWNER' && !replaced) {
        replaced = true; const id = newOralId(); let saved = true
        try { sessionStorage.setItem(`${key}:client`, id) } catch { saved = false }
        controlledRef.current = false; setControlled(false); remember(null); setIdentity({ id, storageAvailable: saved })
        if (!saved) setStorageWarning(true)
      }
    }
    channel.postMessage({ type: 'PROBE', client: identity.id, instance })
    return () => channel.close()
  }, [identity.id, key, remember])

  /** Không tự đóng bài khi rời trang. Pause tốt nhất nếu đang nghe/trả lời; GET sau đó vẫn lấy BE làm chuẩn. */
  const pauseBeforeLeave = async () => {
    if (current.current && ['SPEAKING', 'ANSWERING'].includes(current.current.phase) && controlledRef.current && !pendingRef.current) await command('PAUSE')
  }
  /** Retry nguyên requestId/turn/revision cũ; không tự gắn yêu cầu vào câu kế tiếp. */
  const retryPending = async () => { if (pendingRef.current) await send(pendingRef.current) }
  /** Trình duyệt chỉ ghi khi BE đang ANSWERING và tab còn lease/thời gian. */
  const recordingCurrent = (turnId: string) => {
    const next = current.current, elapsed = performance.now() - lastReceived.current
    return !!next && controlledRef.current && next.currentTurnId === turnId && next.phase === 'ANSWERING'
      && Date.parse(next.deadline) - Date.parse(next.serverTime) > elapsed && Date.parse(next.leaseUntil) - Date.parse(next.serverTime) > elapsed
      && (next.answerRemainingMs == null || next.answerRemainingMs > elapsed)
  }
  /** Xóa draft chỉ sau khi server xác nhận đã nhận file hoặc lượt cũ không còn dùng được. */
  const forgetAudio = useCallback(async () => {
    await saveAudioDraft(draftKey, null); draftRef.current = null; if (alive.current) setAudioDraft(null)
  }, [draftKey])
  /** Gửi lại đúng Blob/submission; không thay nội dung bằng bản ghi mới khi lỗi mạng. */
  const uploadDraft = useCallback(async () => {
    const draft = draftRef.current, next = current.current
    if (!draft || !next || uploadLock.current || !controlledRef.current || !alive.current) return
    if (next.currentTurnId !== draft.command.turnId || oralTerminal(next) || next.audioReceived || next.phase === 'DECIDING') { await forgetAudio(); return }
    if (next.phase !== 'TRANSCRIBING' || !next.submissionId || !next.currentTurnId) return
    uploadLock.current = true; setUploading(true)
    try {
      const response = await oralApi.uploadAudio(examId, next.submissionId, { clientSessionId: identity.id, turnId: next.currentTurnId }, draft.blob)
      if (pendingRef.current?.requestId === draft.command.requestId) remember(null)
      apply(response); if (response.audioReceived || response.phase !== 'TRANSCRIBING') await forgetAudio()
    } catch (cause) {
      if (oralErrorCode(cause)===1803) { controlledRef.current=false; if (alive.current) setControlled(false) }
      if (alive.current) { const message = oralError(cause); setIssue(message); feedback.notify({ title: 'Chưa xác nhận đã nhận bản ghi', message, tone: 'error' }) }
    } finally { uploadLock.current = false; if (alive.current) setUploading(false) }
  }, [examId, identity.id, apply, forgetAudio, feedback, remember])
  /** Lưu Blob bền trước SUBMIT; không nhận transcript gõ tay và không gửi câu đã đổi lượt. */
  const submitRecording = async (turnId: string, blob: Blob) => {
    if (!recordingCurrent(turnId) || pendingRef.current || queuedWrite.current || uploadLock.current || draftRef.current) throw new Error('Lượt trả lời chưa sẵn sàng.')
    const next = current.current!
    const draft: OralAudioDraft = { blob, command: { requestId: newOralId(), clientSessionId: identity.id, expectedRevision: next.revision, turnId, action: 'SUBMIT' } }
    await saveAudioDraft(draftKey, draft); draftRef.current = draft; if (alive.current) setAudioDraft(draft)
    if (!recordingCurrent(turnId)) return
    await reserveDraft()
  }
  /** Reload cùng tab đọc draft, không tự mở micro hoặc gửi câu trả lời trước khi nhận lại quyền. */
  useEffect(() => {
    let cancelled = false
    loadAudioDraft(draftKey, identity.id).then(value => { if (!cancelled) { draftRef.current = value; setAudioDraft(value) } }).catch(() => { /* Khi ghi mới sẽ báo lỗi lưu rõ ràng; không tự SUBMIT. */ })
    return () => { cancelled = true }
  }, [draftKey, identity.id])
  /** Khi server đã nhận audio thì refresh có thể dọn Blob local mà không mất công việc STT. */
  useEffect(() => {
    if (audioDraft && state && (state.audioReceived || oralTerminal(state) || state.currentTurnId !== audioDraft.command.turnId || state.phase === 'DECIDING')) void forgetAudio().catch(() => {})
  }, [audioDraft, state, forgetAudio])
  /** Chỉ sau 1802 xác nhận request cũ bị từ chối mới đổi revision/requestId, giữ nguyên Blob và turn. */
  const reserveDraft = async () => {
    const draft = draftRef.current
    if (!draft) return
    let ok = await send(draft.command, true)
    const next = current.current
    if (!ok && lastWriteFailure.current === 1802 && next?.phase === 'ANSWERING' && next.currentTurnId === draft.command.turnId && !next.submissionId && controlledRef.current) {
      const revised = { ...draft, command: { ...draft.command, requestId: newOralId(), expectedRevision: next.revision } }
      await saveAudioDraft(draftKey, revised); draftRef.current = revised; if (alive.current) setAudioDraft(revised)
      ok = await send(revised.command)
    } else if (!ok && alive.current) feedback.notify({ title: 'Chưa thể nộp bản ghi', message: lastWriteMessage.current || 'Bản ghi vẫn được giữ. Kiểm tra tiến trình và nhận lại quyền của tab trước khi gửi tiếp.', tone: 'error' })
    if (ok) {
      if (current.current?.phase === 'ANSWERING' && current.current.currentTurnId === draft.command.turnId) await forgetAudio()
      else await uploadDraft()
    }
  }
  /** Khôi phục thủ công sau lỗi mạng, dùng nguyên receipt ban đầu nếu SUBMIT chưa rõ kết quả. */
  const resumeAudio = async () => {
    const draft = draftRef.current
    if (!draft || queuedWrite.current || !controlledRef.current || uploadLock.current) return
    if (current.current?.phase === 'ANSWERING' && current.current.currentTurnId === draft.command.turnId) {
      await reserveDraft(); return
    }
    if (current.current?.phase === 'TECHNICAL_ERROR' && current.current.currentTurnId === draft.command.turnId && !current.current.audioReceived) await command('RETRY')
    await uploadDraft()
  }
  /** Chỉ bỏ bản local khi BE vẫn chưa vào bước nhận dạng; không xóa audio đã nộp. */
  const discardAudio = async () => {
    if (pendingRef.current || uploadLock.current) return
    await refresh()
    if (current.current && ['ANSWERING', 'SPEAKING'].includes(current.current.phase)) await forgetAudio()
  }
  /** Chỉ phát đúng turn đang nghe; kiểm tra hạn theo mốc server, không theo giờ hệ điều hành máy Student. */
  const speechCurrent = (turnId: string) => {
    const next = current.current
    return !!next && controlledRef.current && next.currentTurnId === turnId && ['PREPARING', 'SPEAKING'].includes(next.phase)
      && Date.parse(next.deadline) - Date.parse(next.serverTime) > performance.now() - lastReceived.current
      && Date.parse(next.leaseUntil) - Date.parse(next.serverTime) > performance.now() - lastReceived.current
  }
  /** Tải audio có thể chậm; poll/heartbeat vẫn tiếp tục, không giữ khóa giao diện suốt lúc gọi TTS. */
  const speech = async (turnId: string, signal: AbortSignal) => {
    const next = current.current
    if (!next || !speechCurrent(turnId)) throw new Error('Lượt nghe đã thay đổi.')
    const blob = await oralApi.speech(examId, { clientSessionId: identity.id, turnId, expectedRevision: next.revision }, signal)
    await refresh(); return blob
  }
  /** Audio thực sự ended mới tính giờ trả lời; callback trễ không được xác nhận lượt khác. */
  const speechFinished = async (turnId: string) => {
    if (!speechCurrent(turnId)) return
    while (inFlight.current && alive.current) await new Promise(resolve => window.setTimeout(resolve, 20))
    await refresh()
    if (speechCurrent(turnId) && current.current?.phase === 'SPEAKING') await command('PROMPT_FINISHED')
  }
  return { state, runtime, loading, busy, controlled, issue, pending, receivedAt, storageWarning, refresh, open, command, retryPending, pauseBeforeLeave, speech, speechCurrent, speechFinished,
    recordingCurrent, submitRecording, audioDraft: !!audioDraft, uploading, resumeAudio, discardAudio }
}
