import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { initTestI18n } from '../../test-utils/i18n.mjs'

/** Test hạ tầng i18n: khởi tạo đồng bộ trong Node, đủ khóa ở cả ba ngôn ngữ, format theo uiLanguage. */
let server, i18n, mod, format
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

before(async () => {
  // Mô phỏng môi trường test hiện có: localStorage chỉ có getItem trả về chuỗi không hợp lệ.
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'TEST_ONLY_TOKEN', setItem() {}, removeItem() {} } })
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  mod = await server.ssrLoadModule('/src/shared/i18n/index.ts')
  format = await server.ssrLoadModule('/src/shared/i18n/format.ts')
  i18n = await initTestI18n(server)
})
after(async () => {
  await server?.close()
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
  else delete globalThis.localStorage
})

const flatten = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) =>
  value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`])
/** Bỏ hậu tố số nhiều của i18next để so khóa giữa các ngôn ngữ có quy tắc số nhiều khác nhau. */
const base = key => key.replace(/_(zero|one|two|few|many|other)$/, '')
const keysOf = async lng => {
  const dir = new URL(`./locales/${lng}/`, import.meta.url)
  const keys = new Set()
  for (const file of (await readdir(dir)).filter(name => name.endsWith('.json'))) {
    const json = JSON.parse(await readFile(new URL(file, dir), 'utf8'))
    for (const key of flatten(json, `${file.replace(/\.json$/, '')}.`)) keys.add(base(key))
  }
  return keys
}

test('init chạy đồng bộ trong Node và chặn giá trị ngôn ngữ không hợp lệ trong localStorage', () => {
  assert.equal(mod.getUiLanguage(), 'vi')
  assert.equal(i18n.t('common.cancel'), 'Hủy')
  assert.equal(mod.isUiLanguage('TEST_ONLY_TOKEN'), false)
})

test('vi, en, ja có cùng tập khóa dịch', async () => {
  const [vi, en, ja] = await Promise.all(['vi', 'en', 'ja'].map(keysOf))
  for (const [name, set] of [['en', en], ['ja', ja]]) {
    assert.deepEqual([...vi].filter(key => !set.has(key)), [], `thiếu khóa ở ${name}`)
    assert.deepEqual([...set].filter(key => !vi.has(key)), [], `thừa khóa ở ${name}`)
  }
})

test('mọi khóa t(\'...\') viết thẳng trong mã nguồn đều tồn tại', async () => {
  const known = await keysOf('vi')
  const root = new URL('../../', import.meta.url)
  const files = []
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir)
      if (entry.isDirectory()) await walk(url)
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(url)
    }
  }
  await walk(root)
  const missing = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/(?:\bt|i18n\.t)\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
      if (!known.has(match[1])) missing.push(`${file.pathname.split('/src/')[1]}: ${match[1]}`)
    }
    for (const match of source.matchAll(/i18nKey="([\w.]+)"/g)) {
      if (!known.has(match[1])) missing.push(`${file.pathname.split('/src/')[1]}: ${match[1]}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('format theo ngôn ngữ giao diện: vi-VN, en-US, ja-JP', async () => {
  const date = new Date(2026, 9, 14, 9, 30)
  assert.equal(format.getUiLocale(), 'vi-VN')
  await i18n.changeLanguage('en'); assert.equal(format.getUiLocale(), 'en-US')
  assert.equal(format.formatDate(date), date.toLocaleDateString('en-US'))
  await i18n.changeLanguage('ja'); assert.equal(format.getUiLocale(), 'ja-JP')
  assert.equal(format.formatNumber(1234.5), (1234.5).toLocaleString('ja-JP'))
  await i18n.changeLanguage('vi')
  assert.equal(format.formatDate(date), date.toLocaleDateString('vi-VN'))
})
