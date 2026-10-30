import StudentExamList from '../components/StudentExamList'

/** Lịch thi thật và lối vào phòng thử riêng; mô phỏng không tác động lượt thi. */
export default function StudentMyExams() {
  return <StudentExamList title="My Exams" subtitle="Your assigned exam sessions and scheduled slots." showOralPreview />
}
