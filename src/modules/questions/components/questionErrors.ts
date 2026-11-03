import i18n from '@/shared/i18n'

// Backend ErrorCode values for the question API (HTTP 409 is shared by 1102, 1103, 1104 and 1105,
// so errors are told apart by `code`, never by status alone).
// (messages: questions.errors.<code>)
const QUESTION_ERROR_CODES: ReadonlySet<number> = new Set([1100, 1101, 1102, 1103, 1104, 1105])

export function questionErrorCode(err: unknown): number | undefined {
  return (err as { response?: { data?: { code?: number } } })?.response?.data?.code
}

export function questionErrorMessage(err: unknown, fallback: string): string {
  const code = questionErrorCode(err)
  if (code !== undefined && QUESTION_ERROR_CODES.has(code)) return i18n.t(`questions.errors.${code}`)
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
