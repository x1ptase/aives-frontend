import { getUiLanguage, type UiLanguage } from './index'

const LOCALE_BY_LANGUAGE: Record<UiLanguage, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
}

/** Locale Intl theo ngôn ngữ giao diện hiện tại. */
export function getUiLocale(): string {
  return LOCALE_BY_LANGUAGE[getUiLanguage()]
}

/** Chuẩn hóa tên người dùng về NFC để dấu tiếng Việt (có thể ở dạng tổ hợp NFD) hiển thị đúng. */
export function normalizeName(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC')
}

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return toDate(value).toLocaleDateString(getUiLocale(), options)
}

export function formatTime(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return toDate(value).toLocaleTimeString(getUiLocale(), options)
}

export function formatDateTime(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return toDate(value).toLocaleString(getUiLocale(), options)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(getUiLocale(), options)
}
