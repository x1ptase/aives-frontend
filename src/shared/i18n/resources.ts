type JsonModule = { default: Record<string, unknown> }

/**
 * Mỗi module một file JSON (locales/<lng>/<module>.json), gộp thành khóa cấp 1 trùng tên file:
 * khóa auth.signin.heading. Nạp eager nên i18n khởi tạo đồng bộ, không cần backend bất đồng bộ.
 */
function collect(files: Record<string, JsonModule>) {
  const translation: Record<string, unknown> = {}
  for (const [path, mod] of Object.entries(files)) {
    const name = path.replace(/^.*\//, '').replace(/\.json$/, '')
    translation[name] = mod.default
  }
  return { translation }
}

export const resources = {
  vi: collect(import.meta.glob<JsonModule>('./locales/vi/*.json', { eager: true })),
  en: collect(import.meta.glob<JsonModule>('./locales/en/*.json', { eager: true })),
  ja: collect(import.meta.glob<JsonModule>('./locales/ja/*.json', { eager: true })),
}
