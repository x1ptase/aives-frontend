import type { OralCommand } from '../oralApi'
import { oralUuid, validateOralCommand } from './oralExamHelpers'

/** Chỉ lưu danh tính tab và yêu cầu chưa xác nhận, không lưu đề/đáp án/token hoặc tự khôi phục trạng thái thi. */
export function oralSessionKey(userId: string, examId: number, apiBase: string): string {
  return `aives:oral-live:v1:${encodeURIComponent(apiBase)}:${encodeURIComponent(userId)}:${examId}`
}
/** UUID mới cho thao tác/tab; localhost hỗ trợ Web Crypto. */
export function newOralId(): string { return crypto.randomUUID() }
/** Giữ danh tính tab qua refresh; lỗi storage không ngăn kiểm tra API nhưng phải báo rõ. */
export function loadOralClient(key: string): { id: string; storageAvailable: boolean } {
  try {
    const existing = sessionStorage.getItem(`${key}:client`)
    if (existing) { oralUuid(existing); return { id: existing, storageAvailable: true } }
  } catch { /* Dữ liệu hỏng hoặc storage bị chặn: tạo danh tính mới. */ }
  const id = newOralId()
  try { sessionStorage.setItem(`${key}:client`, id); return { id, storageAvailable: true } }
  catch { return { id, storageAvailable: false } }
}
/** Không phục hồi payload lạ hoặc thuộc tab khác. */
export function loadOralPending(key: string, clientId: string): OralCommand | null {
  try {
    const raw = sessionStorage.getItem(`${key}:pending`)
    if (!raw || raw.length > 2000) return null
    const value = JSON.parse(raw) as OralCommand
    validateOralCommand(value)
    if (value.action === 'HEARTBEAT') return null
    if (value.clientSessionId !== clientId) return null
    return { requestId: value.requestId, clientSessionId: value.clientSessionId, expectedRevision: value.expectedRevision,
      turnId: value.turnId, action: value.action, ...(value.action === 'REVISIT' ? { targetQuestionOrder: value.targetQuestionOrder } : {}) }
  } catch { return null }
}
/** Quyền đã xác nhận hoặc payload cần giữ đều phải cập nhật đúng key của lượt hiện tại. */
export function saveOralPending(key: string, command: OralCommand | null): boolean {
  try {
    if (command) sessionStorage.setItem(`${key}:pending`, JSON.stringify(command))
    else sessionStorage.removeItem(`${key}:pending`)
    return true
  } catch { return false }
}
