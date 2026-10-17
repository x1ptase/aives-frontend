import type { QuestionStatus } from '../api'

export const QUESTION_STATUSES: QuestionStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']

const STYLES: Record<QuestionStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
}

// The backend currently only lets a DRAFT be edited; legacy rows with no status are locked.
export const isEditableStatus = (status?: string | null) => status === 'DRAFT'

// The backend only deletes drafts (and refuses ones already used in an exam).
export const isDeletableStatus = (status?: string | null) => status === 'DRAFT'

// Questions that are not yet approved can be approved into the official bank
export const isApprovableStatus = (status?: string | null) => status !== 'APPROVED'

export default function QuestionStatusBadge({ status }: { status?: string | null }) {
  const style = (status && STYLES[status as QuestionStatus]) || 'bg-slate-50 text-slate-500 border-slate-200'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${style}`}>
      {status ? status.replace('_', ' ') : 'UNCLASSIFIED'}
    </span>
  )
}

// Icon-only indicator: a clipboard with a check when the question has a grading rubric.
export function RubricBadge({ hasRubric }: { hasRubric?: boolean }) {
  return hasRubric ? (
    <span
      title="Has rubric"
      aria-label="Has rubric"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </span>
  ) : (
    <span title="No rubric" aria-label="No rubric" className="text-slate-300 text-sm">—</span>
  )
}
