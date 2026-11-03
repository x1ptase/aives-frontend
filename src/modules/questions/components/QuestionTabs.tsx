import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import type { QuestionStatus } from '../api'

export type QuestionTab = 'DRAFT' | 'APPROVED' | 'ALL'

const TABS: { key: QuestionTab }[] = [{ key: 'DRAFT' }, { key: 'APPROVED' }, { key: 'ALL' }]

// The search API filters by one status at a time. DRAFT and APPROVED tabs pin the status;
// the All tab falls back to the optional status dropdown (covers PENDING_REVIEW / REJECTED).
export const tabStatus = (tab: QuestionTab, dropdownStatus: QuestionStatus | ''): QuestionStatus | '' =>
  tab === 'ALL' ? dropdownStatus : tab

export const emptyTabMessage = (tab: QuestionTab) =>
  tab === 'DRAFT' ? i18n.t('questions.tabs.emptyDraft') : tab === 'APPROVED' ? i18n.t('questions.tabs.emptyApproved') : null

interface QuestionTabsProps {
  value: QuestionTab
  onChange: (tab: QuestionTab) => void
  className?: string
}

export default function QuestionTabs({ value, onChange, className = '' }: QuestionTabsProps) {
  const { t: translate } = useTranslation()
  return (
    <div className={`px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 ${className}`}>
      <div className="inline-flex gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm" role="tablist">
        {TABS.map(t => {
          const active = t.key === value
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {translate(`questions.tabs.${t.key}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
