import type { OralCommand } from '../oralApi'
import { validateOralCommand } from './oralExamHelpers'

/** Chỉ lưu Blob và receipt, không lưu token/đề/rubric; key tách theo backend/user/exam/tab. */
export interface OralAudioDraft { command: OralCommand; blob: Blob }
/** IndexedDB giữ bản ghi đã bấm gửi trong lúc reserve/upload mất response. */
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Trình duyệt chưa cho lưu bản ghi chờ gửi.')); return }
    const request = indexedDB.open('aives-oral-audio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Không mở được vùng lưu bản ghi.'))
  })
}
/** Chỉ resolve sau transaction commit để không dành job trước khi Blob được lưu. */
export async function saveAudioDraft(key: string, value: OralAudioDraft | null): Promise<void> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite'), store = transaction.objectStore('drafts')
    if (value) store.put(value, key); else store.delete(key)
    transaction.oncomplete = () => { db.close(); resolve() }; transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('Không lưu được bản ghi chờ gửi.')) }
  })
}
/** Không tin dữ liệu local cũ/sai scope; luôn kiểm tra lại command và Blob trước request. */
export async function loadAudioDraft(key: string, clientId: string): Promise<OralAudioDraft | null> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts'), request = transaction.objectStore('drafts').get(key)
    request.onsuccess = () => {
      try {
        const value = request.result
        if (!value) { resolve(null); return }
        validateOralCommand(value.command)
        if (value.command.action !== 'SUBMIT' || value.command.clientSessionId !== clientId || !(value.blob instanceof Blob) || value.blob.size < 128 || value.blob.size > 8 * 1024 * 1024) throw new Error()
        resolve({ command: value.command, blob: value.blob })
      } catch { reject(new Error('Bản ghi chờ không còn phù hợp với tab này.')) }
    }
    transaction.oncomplete = () => db.close(); transaction.onerror = () => { db.close(); reject(new Error('Không đọc được bản ghi chờ.')) }
  })
}
