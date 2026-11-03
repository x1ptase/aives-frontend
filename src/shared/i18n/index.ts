import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'ja'] as const
export type UiLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: UiLanguage = 'vi'
export const LANGUAGE_STORAGE_KEY = 'aives.lang'

export const LANGUAGE_LABELS: Record<UiLanguage, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
}

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/** Ngôn ngữ đã lưu -> ngôn ngữ trình duyệt -> mặc định. Mọi truy cập môi trường đều có guard để chạy được trong Node. */
function detectLanguage(): UiLanguage {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (isUiLanguage(saved)) return saved
    }
  } catch {
    // Storage có thể không khả dụng (private mode, Node).
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
      const base = navigator.language.slice(0, 2).toLowerCase()
      if (isUiLanguage(base)) return base
    }
  } catch {
    // Bỏ qua, dùng mặc định.
  }
  return DEFAULT_LANGUAGE
}

function syncDocumentLang(lng: string) {
  if (typeof document !== 'undefined' && document?.documentElement) {
    document.documentElement.lang = lng
  }
}

// Khởi tạo ĐỒNG BỘ: resources được import sẵn, không dùng backend bất đồng bộ.
void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
  react: { useSuspense: false },
})

syncDocumentLang(i18n.language)
i18n.on('languageChanged', syncDocumentLang)

/** Ngôn ngữ giao diện hiện tại, luôn là một trong SUPPORTED_LANGUAGES. */
export function getUiLanguage(): UiLanguage {
  return isUiLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE
}

export async function setUiLanguage(lng: UiLanguage) {
  await i18n.changeLanguage(lng)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
  } catch {
    // Không lưu được thì chỉ áp dụng cho phiên hiện tại.
  }
}

export default i18n
