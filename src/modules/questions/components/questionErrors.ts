// Backend ErrorCode values for the question API (HTTP 409 is shared by 1102, 1103, 1104 and 1105,
// so errors are told apart by `code`, never by status alone).
const QUESTION_ERROR_MESSAGES: Record<number, string> = {
  1100: 'Question not found, or it is no longer available to you.',
  1101: 'You are not assigned to this subject.',
  1102: 'Only drafts that are not archived can be edited or deleted.',
  1103: 'This question is already used in an exam and cannot be changed.',
  1104: 'This question was changed by someone else. Close this dialog and reopen it to get the latest version.',
  1105: 'The question is referenced elsewhere or is being modified at the same time. Please try again.',
}

export function questionErrorCode(err: unknown): number | undefined {
  return (err as { response?: { data?: { code?: number } } })?.response?.data?.code
}

export function questionErrorMessage(err: unknown, fallback: string): string {
  const code = questionErrorCode(err)
  if (code !== undefined && QUESTION_ERROR_MESSAGES[code]) return QUESTION_ERROR_MESSAGES[code]
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
