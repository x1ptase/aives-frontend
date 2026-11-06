import type { OralState } from '../oralApi'

type Stage = 'audioFlushed' | 'draftSaved' | 'finishSent' | 'wsResult' | 'transcribing' | 'deciding' | 'nextState' | 'ttsRequest' | 'firstAudio'
interface Trace { fromTurn: string; examId?: number; nextTurn?: string; started: number; marks: Partial<Record<Stage, number>> }
const traces = new Map<string, Trace>()
const enabled = () => import.meta.env.DEV || import.meta.env.VITE_ORAL_LATENCY_LOGS === 'true'
const now = () => performance.now()
const prune = () => { for (const trace of traces.values()) if (now() - trace.started > 120000) traces.delete(trace.fromTurn) }

/** Chỉ ID và thời lượng trong RAM; không gửi transcript, token hoặc nội dung đề vào log. */
export const oralLatency = {
  begin(turn: string, examId?: number) {
    if (!enabled()) return
    prune()
    const existing = traces.get(turn)
    if (existing) { if (examId !== undefined) existing.examId = examId; return }
    while (traces.size >= 8) traces.delete(traces.keys().next().value!)
    traces.set(turn, { fromTurn: turn, examId, started: now(), marks: {} })
  },
  mark(turn: string, stage: Stage) {
    for (const trace of traces.values()) if (trace.fromTurn === turn || trace.nextTurn === turn) trace.marks[stage] ??= now()
  },
  state(state: OralState) {
    prune()
    for (const trace of traces.values()) {
      if (trace.examId !== state.studentExamId) continue
      if (state.currentTurnId === trace.fromTurn && state.phase === 'TRANSCRIBING') this.mark(trace.fromTurn, 'transcribing')
      if (state.currentTurnId === trace.fromTurn && state.phase === 'DECIDING') this.mark(trace.fromTurn, 'deciding')
      if (state.currentTurnId && state.currentTurnId !== trace.fromTurn && ['PREPARING', 'SPEAKING'].includes(state.phase)) {
        trace.nextTurn ??= state.currentTurnId; this.mark(trace.fromTurn, 'nextState')
      }
      if (['COMPLETED', 'EXPIRED', 'TECHNICAL_ERROR', 'REVIEW', 'PAUSED'].includes(state.phase)) finish(trace, state.phase, now())
    }
  },
  audioScheduled(turn: string, delayMs: number) {
    for (const trace of traces.values()) if (trace.nextTurn === turn) finish(trace, 'FIRST_AUDIO_SCHEDULED', now() + Math.max(0, delayMs))
  },
  cancel(turn: string) { for (const trace of traces.values()) if (trace.fromTurn === turn || trace.nextTurn === turn) traces.delete(trace.fromTurn) },
}
function finish(trace: Trace, outcome: string, ended: number) {
  const stages = Object.fromEntries(Object.entries(trace.marks).map(([stage, at]) => [`${stage}Ms`, Math.round(at! - trace.started)]))
  // Scheduled playback là ước lượng theo AudioContext, không khẳng định độ trễ loa vật lý.
  const total = outcome === 'FIRST_AUDIO_SCHEDULED' ? { submitToPlaybackScheduledMs: Math.round(ended - trace.started) } : { submitToOutcomeMs: Math.round(ended - trace.started) }
  try { console.info('oral-latency', { examId: trace.examId, fromTurn: trace.fromTurn, nextTurn: trace.nextTurn, outcome,
    ...total, ...stages }) } catch { /* Diagnostics must not affect the exam. */ }
  traces.delete(trace.fromTurn)
}
