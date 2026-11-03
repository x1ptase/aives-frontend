import { useTranslation } from 'react-i18next'
import StudentExamList from '../components/StudentExamList'

/** Trang dùng lịch thi cá nhân thật; không giả lập chức năng bắt đầu hoặc chấm thi. */
export default function ExamHistory() {
  const { t } = useTranslation()
  return <StudentExamList title={t('exams.pages.history.title')} subtitle={t('exams.pages.history.subtitle')} />
}
