/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Cùng stack với biến CSS trong src/index.css (Latin/Việt trước, JP sau).
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'Inter', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', 'sans-serif'],
        mono: ['JetBrains Mono', 'Inter', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}