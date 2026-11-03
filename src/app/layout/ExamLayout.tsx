import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ExamLayout() {
  // Không gắn LanguageSwitcher: phòng thi dùng ngôn ngữ đã chọn trước đó.
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-white">
      {/* Exam header */}
      <header className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('layout.examRoomTitle')}</h1>
        {/* TODO: Add timer, student info */}
      </header>

      {/* Exam content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
