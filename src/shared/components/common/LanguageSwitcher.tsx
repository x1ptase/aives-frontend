import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, getUiLanguage, isUiLanguage, setUiLanguage, type UiLanguage } from '@/shared/i18n'
import vnFlag from '@/shared/assets/flags/vn.svg'
import usFlag from '@/shared/assets/flags/us.svg'
import jpFlag from '@/shared/assets/flags/jp.svg'

/** Tên ngôn ngữ luôn viết bằng chính ngôn ngữ đó, không dịch theo ngôn ngữ giao diện. */
const OPTIONS: Record<UiLanguage, { flag: string; name: string; code: string }> = {
  vi: { flag: vnFlag, name: 'Tiếng Việt', code: 'VI' },
  en: { flag: usFlag, name: 'English', code: 'EN' },
  ja: { flag: jpFlag, name: '日本語', code: 'JA' },
}

/** Cờ trang trí (alt rỗng) vì tên ngôn ngữ đã có bằng chữ; viền mảnh để cờ trắng không mất trên nền sáng. */
function Flag({ src }: { src: string }) {
  return <img src={src} alt="" aria-hidden="true" width={20} height={14} draggable={false}
    className="h-3.5 w-5 flex-shrink-0 rounded-[3px] object-cover ring-1 ring-slate-300/80" />
}

interface LanguageSwitcherProps {
  className?: string
  /** Mép của nút mà danh sách bám vào; mặc định 'right' vì switcher nằm ở góc phải. */
  align?: 'left' | 'right'
}

export default function LanguageSwitcher({ className = '', align = 'right' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation()
  const current = isUiLanguage(i18n.language) ? i18n.language : getUiLanguage()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    list.current?.focus()
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const openList = () => { setActive(Math.max(0, SUPPORTED_LANGUAGES.indexOf(current))); setOpen(true) }
  const close = (restoreFocus = true) => { setOpen(false); if (restoreFocus) button.current?.focus() }
  const choose = (lng: UiLanguage) => { void setUiLanguage(lng); close() }

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() }
  }
  const onListKey = (e: KeyboardEvent) => {
    const last = SUPPORTED_LANGUAGES.length - 1
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(last, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(last) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(SUPPORTED_LANGUAGES[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
  }

  const cur = OPTIONS[current]
  return (
    // className (vd. "absolute top-3 right-3") nằm ở lớp ngoài để không xung đột với `relative` của lớp trong.
    <div className={className}>
    <div ref={root} className="relative inline-block text-left">
      <button
        ref={button}
        type="button"
        aria-label={`${t('common.language')}: ${cur.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onButtonKey}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
      >
        <Flag src={cur.flag} />
        <span className="hidden sm:inline">{cur.name}</span>
        <span className="sm:hidden">{cur.code}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={t('common.language')}
          aria-activedescendant={`${listId}-${SUPPORTED_LANGUAGES[active]}`}
          onKeyDown={onListKey}
          className={`absolute top-full z-50 mt-1.5 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg focus:outline-none ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {SUPPORTED_LANGUAGES.map((lng, index) => {
            const option = OPTIONS[lng]
            const selected = lng === current
            return (
              <li
                key={lng}
                id={`${listId}-${lng}`}
                role="option"
                aria-selected={selected}
                onClick={() => choose(lng)}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 ${index === active ? 'bg-slate-100' : ''} ${selected ? 'font-semibold' : ''}`}
              >
                <Flag src={option.flag} />
                <span className="flex-1">{option.name}</span>
                {selected && (
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </div>
  )
}
