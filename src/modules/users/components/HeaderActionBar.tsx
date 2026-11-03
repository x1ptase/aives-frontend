import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@/shared/components/common/Icons'

interface HeaderActionBarProps {
  counts: { total: number; students: number; lecturers: number; admins: number }
  onAddUser: () => void
}

export default function HeaderActionBar({ counts, onAddUser }: HeaderActionBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-5 bg-white border-b border-slate-200">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>{t('users.header.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('users.header.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onAddUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', fontFamily: 'DM Sans, sans-serif' }}
          >
            <PlusIcon />
            {t('users.header.createLecturer')}
          </button>
        </div>
      </div>
      {/* Mini stat strip */}
      <div className="flex items-center gap-x-6 gap-y-2 flex-wrap mt-5">
        {[
          { label: t('users.header.totalUsers'), val: counts.total, color: '#1d4ed8' },
          { label: t('users.header.students'), val: counts.students, color: '#7c3aed' },
          { label: t('users.header.lecturers'), val: counts.lecturers, color: '#0369a1' },
          { label: t('users.header.admins'), val: counts.admins, color: '#9333ea' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ fontFamily: 'DM Sans, sans-serif', color: s.color }}>{s.val}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
