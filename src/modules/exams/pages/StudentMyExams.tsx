import { useTranslation } from 'react-i18next'
import StudentExamList from '../components/StudentExamList'

/** Lịch thi thật và lối vào phòng thử riêng; mô phỏng không tác động lượt thi. */
export default function StudentMyExams() {
  const { t } = useTranslation()
  return <StudentExamList title={t('exams.pages.myExams.title')} subtitle={t('exams.pages.myExams.subtitle')} showOralPreview />
}
