import axiosInstance from '@/shared/api/axios'
import type { PageResult } from '@/shared/api/types'

// ===== Questions & Rubrics =====
export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'

export interface QuestionGeneratePayload {
  subjectId: number | string
  keyword: string
  bloomLevel?: BloomLevel | null
  count?: number
  materialIds?: (number | string)[]
}

export interface RubricCriterion {
  id: number | string
  criterionText: string
  pointWeight: number
  isMandatory: boolean
  displayOrder: number
}

export interface Rubric {
  id: number | string
  questionId: number | string
  title: string
  description?: string
  createdAt?: string
  criteria: RubricCriterion[]
}

/** Rubric dùng chung theo môn, tách hợp đồng cũ theo câu hỏi để không đổi các màn hình hiện có. */
export interface SubjectRubric extends Omit<Rubric, 'questionId'> {
  /** Môn sở hữu rubric. */ subjectId: number | string
  /** Thời điểm cập nhật gần nhất nếu backend cung cấp. */ updatedAt?: string | null
}

/** Tiêu chí ghi theo thứ tự trên form; không gửi ID cũ vì BE thay danh sách tiêu chí khi cập nhật. */
export interface SubjectRubricCriterionPayload {
  /** Nội dung tiêu chí chấm. */ criterionText: string
  /** Điểm tối đa, tổng rubric đúng 10. */ pointWeight: number
  /** Cờ bắt buộc hiện hành. */ isMandatory: boolean
  /** Thứ tự dương không trùng. */ displayOrder: number
}

/** Tạo rubric của một môn được phân công; mỗi môn chỉ có tối đa một rubric. */
export interface SubjectRubricCreatePayload {
  /** Môn học được chọn từ phân công hiện hành. */ subjectId: number
  /** Tên bộ tiêu chí. */ title: string
  /** Hướng dẫn chung. */ description: string
  /** Toàn bộ các tiêu chí. */ criteria: SubjectRubricCriterionPayload[]
}

/** PUT không được đổi môn sở hữu hoặc gửi điểm bài thi. */
export type SubjectRubricUpdatePayload = Omit<SubjectRubricCreatePayload, 'subjectId'>

/** API rubric cấp môn dùng chung cho màn hình CRUD và điều kiện tạo phiên. */
export const subjectRubricApi = {
  /** Chỉ đọc rubric của môn giảng viên được phép truy cập. */
  getBySubject: (subjectId: number, signal?: AbortSignal) => axiosInstance.get<{ code: number; result: SubjectRubric }>(`/rubrics/subject/${subjectId}`, { signal }),
  /** Tạo bằng subjectId, quyền thực tế được BE kiểm tra lại. */
  create: (data: SubjectRubricCreatePayload) => axiosInstance.post<{ code: number; result: SubjectRubric }>('/rubrics', data),
  /** Sửa bằng ID rubric, không dùng ID môn thay thế. */
  update: (id: number, data: SubjectRubricUpdatePayload) => axiosInstance.put<{ code: number; result: SubjectRubric }>(`/rubrics/${id}`, data),
  /** Xóa rubric/tiêu chí nguồn; không xóa bản chụp của bài thi đã chốt. */
  delete: (id: number) => axiosInstance.delete<{ code: number; message?: string }>(`/rubrics/${id}`),
}

export type QuestionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type QuestionSourceType = 'MANUAL' | 'IMPORT' | 'AI'

// Row returned by GET /questions (QuestionSummaryResponse)
export interface QuestionSummary {
  id: number | string
  subjectId: number | string
  subjectName?: string
  contentPreview?: string
  topics?: string[]
  bloomLevel?: BloomLevel | null
  sourceType?: QuestionSourceType | null
  status?: QuestionStatus | null
  createdById?: number | string
  createdByName?: string
  createdAt?: string
  archivedAt?: string | null
  hasRubric: boolean
}

export interface QuestionSearchParams {
  subjectId?: number | string
  topic?: string
  bloomLevel?: BloomLevel
  status?: QuestionStatus
  sourceType?: QuestionSourceType
  keyword?: string
  createdById?: number | string
  archived?: boolean
  page?: number
  size?: number
  sort?: string
}

export interface QuestionItem {
  id: number | string
  subjectId: number | string
  subjectName?: string
  content: string
  referenceAnswer?: string
  topics?: string[]
  bloomLevel?: BloomLevel
  answerTimeLimitSeconds?: number
  sourceType?: QuestionSourceType | null
  status?: QuestionStatus | null
  createdById?: number | string
  createdByName?: string
  updatedById?: number | string
  createdAt?: string
  updatedAt?: string
  archivedAt?: string | null
  version?: number
  rubricId?: number | string
  rubric?: Rubric
}

// PATCH semantics: an omitted field is left unchanged, an explicit null clears it.
export interface QuestionUpsertPayload {
  subjectId?: number | string
  expectedVersion?: number
  content?: string
  referenceAnswer?: string | null
  topics?: string[]
  bloomLevel?: BloomLevel | null
  answerTimeLimitSeconds?: number | null
}

export const questionApi = {
  search: (params: QuestionSearchParams) =>
    axiosInstance.get<{ code?: number; result: PageResult<QuestionSummary> }>('/questions', { params }),

  getById: (id: string | number) => axiosInstance.get<{ code: number; result: QuestionItem }>(`/questions/${id}`),

  create: (data: QuestionUpsertPayload) =>
    axiosInstance.post<{ code: number; result: QuestionItem }>('/questions', data),

  update: (id: string | number, data: QuestionUpsertPayload) =>
    axiosInstance.patch<{ code: number; result: QuestionItem }>(`/questions/${id}`, data),

  delete: (id: string | number) => axiosInstance.delete(`/questions/${id}`),

  generate: (data: QuestionGeneratePayload) =>
    axiosInstance.post<{ code: number; message: string; result: QuestionItem[] }>('/questions/generate', data, {
      timeout: 120000, // AI generation (RAG + LLM) routinely exceeds the 10s default
    }),

  approve: (id: string | number) =>
    axiosInstance.post<{ code: number; message: string; result: QuestionItem }>(`/questions/${id}/approve`),
}
