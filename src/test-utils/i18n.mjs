/**
 * Helper dùng chung cho test: nạp module i18n qua cùng Vite server với code đang test
 * (cùng một instance) và ép ngôn ngữ 'vi' để các assert tiếng Việt hiện có giữ nguyên.
 * Gọi sau khi createServer và trước khi load module cần test.
 */
export async function initTestI18n(server, lng = 'vi') {
  const mod = await server.ssrLoadModule('/src/shared/i18n/index.ts')
  await mod.default.changeLanguage(lng)
  return mod.default
}
