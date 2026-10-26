import StudentExamList from '../components/StudentExamList'

/** Trang dùng lịch thi cá nhân thật; không giả lập chức năng bắt đầu hoặc chấm thi. */
export default function ExamHistory() {
  return <StudentExamList title="Exam History" subtitle="Your current and past exam records. Scores and grading history are not available yet." />
}
