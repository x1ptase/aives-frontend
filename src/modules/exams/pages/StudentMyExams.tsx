import StudentExamList from '../components/StudentExamList'

/** Trang dùng lịch thi cá nhân thật; không giả lập chức năng bắt đầu hoặc chấm thi. */
export default function StudentMyExams() {
  return <StudentExamList title="My Exams" subtitle="Your assigned exam sessions and scheduled slots." />
}
