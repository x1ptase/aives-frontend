import axiosInstance from '@/shared/api/axios'
import type { PageResult } from '@/shared/api/types'

/** Envelope chuẩn của backend, không đồng nhất result phân trang với một mảng. */
export interface ExamApiResponse<T> {
  /** Mã thành công của ứng dụng là 1000. */ code: number
  /** Thông báo nghiệp vụ nếu có. */ message?: string
  /** Kết quả đã được service kiểm tra quyền. */ result: T
}

/** Trạng thái phiên do backend quản lý, không gửi từ form tạo/sửa. */
export type ExamSessionStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED'
/** Trạng thái lượt thi, không phải trạng thái phiên thi. */
export type StudentExamStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABSENT' | 'EXPIRED'

/** Trạng thái do máy chủ xác nhận sau Start hoặc Finish, không kèm điểm/đáp án. */
export interface ExamAttempt {
  /** ID lượt thi của chính sinh viên. */ id: number
  /** ID phiên thi. */ sessionId: number
  /** Trạng thái lượt thi. */ status: StudentExamStatus
  /** Trạng thái phiên. */ sessionStatus: ExamSessionStatus
  /** Giờ bắt đầu thực tế. */ startedAt: string | null
  /** Giờ hoàn thành thực tế, không dùng cho vắng/hết giờ. */ completedAt: string | null
  /** Hạn cuối không thay đổi khi vào muộn. */ deadlineAt: string | null
}

/** Đề từ snapshot được phép hiển thị; không chứa rubric hoặc đáp án tham khảo. */
export interface StartedExam {
  /** Trạng thái và hạn thi do máy chủ quyết định. */ attempt: ExamAttempt
  /** Bộ câu theo thứ tự đã lưu. */ questions: {
    /** ID liên kết dùng để Feature 3 lưu hội thoại. */ studentExamQuestionId: number
    /** Thứ tự chính thức. */ questionOrder: number
    /** Nội dung lịch sử. */ content: string
    /** Giới hạn riêng nếu có. */ answerTimeLimitSeconds: number | null
  }[]
}

/** Kết quả đóng phiên, không tạo điểm hoặc đánh dấu vắng thành đã hoàn thành bài. */
export interface ClosedExamSession {
  /** ID phiên đã đóng. */ sessionId: number
  /** Trạng thái phiên cuối cùng. */ status: ExamSessionStatus
  /** Số bài đã hoàn thành. */ completedCount: number
  /** Số sinh viên chưa bắt đầu. */ absentCount: number
  /** Số bài đã bắt đầu nhưng chưa hoàn thành. */ expiredCount: number
}

/** Phiên thi trả về từ API CRUD, không chứa đáp án hay rubric nội bộ. */
export interface ExamSession {
  /** ID phiên. */ id: number
  /** Tiêu đề. */ title: string
  /** Chủ sở hữu do backend xác định. */ lecturerId: number
  /** Môn học bất biến khi sửa phiên. */ subjectId: number
  /** Mã môn. */ subjectCode: string
  /** Tên môn. */ subjectName: string
  /** Trạng thái phiên. */ status: ExamSessionStatus
  /** Giờ bắt đầu; null cho dữ liệu legacy. */ scheduledStartAt: string | null
  /** Giờ kết thúc; null cho dữ liệu legacy. */ scheduledEndAt: string | null
  /** Số phút mỗi slot; null cho dữ liệu legacy. */ slotDurationMinutes: number | null
  /** Số câu chính. */ maxMainQuestions: number
  /** Số câu phụ tối đa. */ maxFollowUps: number
  /** Thời điểm tạo. */ createdAt: string
}

/** Payload tạo phiên; chỉ nhận những field backend cho phép. */
export interface ExamSessionPayload {
  /** Tiêu đề đã trim. */ title: string
  /** ID môn hiện được phân công. */ subjectId: number
  /** ISO-8601 có offset (UTC Z). */ scheduledStartAt: string
  /** ISO-8601 có offset (UTC Z). */ scheduledEndAt: string
  /** Phút mỗi sinh viên. */ slotDurationMinutes: number
  /** Số câu chính dương. */ maxMainQuestions: number
  /** Số câu phụ, cho phép 0. */ maxFollowUps: number
}

/** PATCH chỉ gửi trường thực sự thay đổi, không gửi subjectId/status/lecturerId. */
export type ExamSessionPatch = Partial<Omit<ExamSessionPayload, 'subjectId'>>

/** Bộ lọc dùng phân trang server, không lọc ownership ở client. */
export interface ExamSessionSearch {
  /** Trang bắt đầu từ 0. */ page?: number
  /** Số bản ghi mỗi trang, tối đa 100. */ size?: number
  /** Chỉ lọc khi đã chọn môn. */ subjectId?: number
  /** Chỉ lọc khi đã chọn trạng thái. */ status?: ExamSessionStatus
}

/** Thông tin tối thiểu để chọn sinh viên, không đọc API quản trị /users. */
export interface EligibleStudent {
  /** ID sinh viên. */ id: number
  /** Tên đăng nhập. */ username: string
  /** Họ tên. */ fullName: string
}

/** Lượt thi và slot đã được backend phân công. */
export interface StudentExamAssignment {
  /** ID lượt thi dùng khi thu hồi, không phải ID sinh viên. */ id: number
  /** ID sinh viên. */ studentId: number
  /** Tên đăng nhập sinh viên. */ studentUsername: string
  /** Họ tên sinh viên. */ studentFullName: string
  /** Trạng thái lượt thi. */ status: StudentExamStatus
  /** Thứ tự slot; null là chưa xếp lịch. */ slotOrder: number | null
  /** Giờ bắt đầu dự kiến. */ scheduledStartAt: string | null
  /** Giờ kết thúc dự kiến. */ scheduledEndAt: string | null
}

/** Kết quả batch nguyên tử và idempotent, không giả định mọi ID đều vừa được tạo. */
export interface StudentAssignmentResult {
  /** Phiên được thao tác. */ sessionId: number
  /** Lượt thi mới. */ created: StudentExamAssignment[]
  /** Lượt đã có được giữ nguyên. */ unchanged: StudentExamAssignment[]
}

/** Lịch thi cá nhân, không có điểm, câu hỏi, đáp án hoặc payload snapshot. */
export interface MyStudentExam {
  /** ID lượt thi. */ id: number
  /** ID phiên thi. */ sessionId: number
  /** Tiêu đề phiên. */ sessionTitle: string
  /** ID môn. */ subjectId: number
  /** Mã môn. */ subjectCode: string
  /** Tên môn. */ subjectName: string
  /** Trạng thái phiên. */ sessionStatus: ExamSessionStatus
  /** Trạng thái lượt thi. */ status: StudentExamStatus
  /** Thứ tự thi, null với legacy. */ slotOrder: number | null
  /** Giờ bắt đầu dự kiến. */ scheduledStartAt: string | null
  /** Giờ kết thúc dự kiến. */ scheduledEndAt: string | null
}

// These reject locally (no network call) so callers fall into their existing error/empty handling.
const unsupported = (feature: string): Promise<{ data: any }> =>
  Promise.reject(new Error(`${feature} is not supported by the backend yet.`))

// ===== Exams =====
export const examApi = {
  getAll: () => unsupported('Exams'),
  getById: (_id: string) => unsupported('Exams'),
  create: (_data: unknown) => unsupported('Exams'),
  update: (_id: string, _data: unknown) => unsupported('Exams'),
  delete: (_id: string) => unsupported('Exams'),
}

// ===== Students =====
export const studentApi = {
  getAll: () => axiosInstance.get('/students'),

  getById: (id: string) => axiosInstance.get(`/students/${id}`),
}

// ===== Grading =====
export const gradingApi = {
  submitAnswer: (data: { examId: string; audioBlob: Blob }) => {
    const formData = new FormData()
    formData.append('exam_id', data.examId)
    formData.append('audio', data.audioBlob, 'answer.webm')
    return axiosInstance.post('/grading/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getResult: (examId: string) => axiosInstance.get(`/grading/result/${examId}`),
}

// ===== Exam Sessions =====
export const examSessionApi = {
  /** Chủ sở hữu đóng phiên sau giờ kết thúc; không gửi trạng thái hoặc kết quả từ client. */
  close: (id: number) => axiosInstance.post<ExamApiResponse<ClosedExamSession>>(`/exam-sessions/${id}/closures`),
  /** Backend tự giới hạn phiên theo người đăng nhập trước khi phân trang. */
  getAll: (params: ExamSessionSearch = {}, signal?: AbortSignal) =>
    axiosInstance.get<ExamApiResponse<PageResult<ExamSession>>>('/exam-sessions', { params, signal }),
  /** Đọc phiên mới nhất trước khi sửa. */
  getById: (id: number) => axiosInstance.get<ExamApiResponse<ExamSession>>(`/exam-sessions/${id}`),
  /** Tạo phiên UPCOMING, backend tự gán owner. */
  create: (data: ExamSessionPayload) => axiosInstance.post<ExamApiResponse<ExamSession>>('/exam-sessions', data),
  /** Không đổi môn hoặc trạng thái, không gửi lại lịch chưa thay đổi. */
  update: (id: number, data: ExamSessionPatch) => axiosInstance.patch<ExamApiResponse<ExamSession>>(`/exam-sessions/${id}`, data),
  /** Chỉ xóa phiên chưa được sử dụng. */
  delete: (id: number) => axiosInstance.delete(`/exam-sessions/${id}`),
}

// ===== Student Exams =====
export const studentExamApi = {
  /** Start hoặc tiếp tục cùng bộ câu đã chốt; server kiểm tra danh tính và khung giờ. */
  start: (id: number) => axiosInstance.post<ExamApiResponse<StartedExam>>(`/student-exams/${id}/starts`),
  /** Feature 3 phải lưu câu trả lời trước; lệnh Finish không chứa answers hoặc điểm. */
  finish: (id: number) => axiosInstance.post<ExamApiResponse<ExamAttempt>>(`/student-exams/${id}/completions`),
  /** Lịch của chính sinh viên từ JWT, không nhận studentId của client. */
  getAll: (params: { page?: number; size?: number } = {}, signal?: AbortSignal) =>
    axiosInstance.get<ExamApiResponse<PageResult<MyStudentExam>>>('/student-exams/me', { params, signal }),
  /** Tra cứu role STUDENT theo tên/username, không dùng API quản trị. */
  eligible: (params: { query?: string; page?: number; size?: number }, signal?: AbortSignal) =>
    axiosInstance.get<ExamApiResponse<PageResult<EligibleStudent>>>('/students/eligible', { params, signal }),
  /** Danh sách sinh viên/slot của một phiên cụ thể. */
  assigned: (sessionId: number, params: { page?: number; size?: number } = {}, signal?: AbortSignal) =>
    axiosInstance.get<ExamApiResponse<PageResult<StudentExamAssignment>>>(`/exam-sessions/${sessionId}/students`, { params, signal }),
  /** Một batch tối đa 100 ID, không chia thành nhiều request tạo từng sinh viên. */
  assign: (sessionId: number, studentIds: number[]) =>
    axiosInstance.post<ExamApiResponse<StudentAssignmentResult>>(`/exam-sessions/${sessionId}/students`, { studentIds }),
  /** Thu hồi bằng ID StudentExam; không xóa user/câu hỏi/tài liệu. */
  unassign: (studentExamId: number) => axiosInstance.delete(`/student-exams/${studentExamId}`),
}
