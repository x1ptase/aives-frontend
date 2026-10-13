import axiosInstance from '@/config/axios'
import type { User } from '@/types'

export interface LoginPayload {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  authenticated: boolean
  role: string
  username: string
  fullName: string
}

export interface SignUpPayload {
  username: string
  email: string
  password: string
  fullName: string
  roleCode?: string
}

export interface BackendUserResponse {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  createdAt: string
}

// ===== Auth =====
export const authApi = {
  login: (credentials: LoginPayload) =>
    axiosInstance.post<{ result: AuthResponse }>('/auth/signin', credentials),

  signup: (data: SignUpPayload) =>
    axiosInstance.post<{ code: number; result: BackendUserResponse }>('/auth/signup', data),

  logout: () => axiosInstance.post<{ status: number; message: string }>('/auth/logout'),

  getProfile: () => axiosInstance.get<{ status: number; user: User }>('/auth/profile'),

  googleSignIn: (_token: string) =>
    Promise.reject(new Error("Google Sign In API endpoint is not yet implemented by the backend contract.")),

  googleSignUp: (_token: string) =>
    Promise.reject(new Error("Google Sign Up API endpoint is not yet implemented by the backend contract.")),
}

export interface UserUpdatePayload {
  username?: string
  fullName?: string
  email?: string
  roleCode?: string
}

export interface UserCreatePayload {
  username: string
  fullName: string
  email: string
  roleCode: 'STUDENT' | 'LECTURER'
  password?: string
}

// ===== Users =====
export const userApi = {
  getMyInfo: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse }>('/users/my-info'),

  getAll: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse[] }>('/users'),

  create: (data: UserCreatePayload) =>
    axiosInstance.post<{ code: number; message?: string; result: BackendUserResponse }>('/users/create', data),

  update: (id: string | number, data: UserUpdatePayload) =>
    axiosInstance.put<{ code: number; result: BackendUserResponse }>(`/users/${id}`, data),

  delete: (id: string | number) =>
    axiosInstance.delete<{ code: number; result: string }>(`/users/${id}`),

  changePassword: (_data: any) =>
    Promise.reject(new Error("Password change API endpoint is not yet implemented by the backend contract. UI is ready.")),

  googleLink: (_token: string) =>
    Promise.reject(new Error("Google Linking API endpoint is not yet implemented by the backend contract.")),
}

// Exam, exam-session and student-exam endpoints are not implemented by the backend yet.
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

export interface QuestionItem {
  id: number | string
  subjectId: number | string
  subjectName?: string
  content: string
  referenceAnswer?: string
  topics?: string[]
  bloomLevel?: BloomLevel
  answerTimeLimitSeconds?: number
  sourceType?: string
  status?: string
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

export interface QuestionUpsertPayload {
  subjectId?: number | string
  content?: string
  referenceAnswer?: string
  topics?: string[]
  bloomLevel?: BloomLevel
  answerTimeLimitSeconds?: number
}

export const questionApi = {
  getAll: () => axiosInstance.get('/questions'),

  getBySubject: (subjectId: string | number) =>
    axiosInstance.get('/questions', { params: { subjectId } }),

  getById: (id: string | number) => axiosInstance.get<{ code: number; result: QuestionItem }>(`/questions/${id}`),

  create: (data: QuestionUpsertPayload) =>
    axiosInstance.post<{ code: number; result: QuestionItem }>('/questions', data),

  update: (id: string | number, data: QuestionUpsertPayload) =>
    axiosInstance.patch<{ code: number; result: QuestionItem }>(`/questions/${id}`, data),

  delete: (id: string | number) => axiosInstance.delete(`/questions/${id}`),

  generate: (data: QuestionGeneratePayload) =>
    axiosInstance.post<{ code: number; message: string; result: QuestionItem[] }>('/questions/generate', data),
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
  getAll: () => unsupported('Exam sessions'),
  getById: (_id: string | number) => unsupported('Exam sessions'),
  create: (_data: any) => unsupported('Exam sessions'),
  update: (_id: string | number, _data: any) => unsupported('Exam sessions'),
  delete: (_id: string | number) => unsupported('Exam sessions'),
}

// ===== Student Exams =====
export const studentExamApi = {
  getAll: () => unsupported('Student exams'),
  assign: (_data: any) => Promise.reject(new Error("Assignment API endpoint is not defined in frontend contract. UI is ready.")),
  unassign: (_id: string | number) => Promise.reject(new Error("Unassign API endpoint is not defined in frontend contract. UI is ready.")),
}

// ===== Learning Materials =====
export interface MaterialResponse {
  id: number | string
  subjectId: number | string
  title?: string
  originalFileName?: string
  storagePath?: string
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string
  createdAt?: string
  updatedAt?: string
}

export const learningMaterialApi = {
  getBySubject: (subjectId: string | number) =>
    axiosInstance.get<{ code?: number; result?: MaterialResponse[] } | MaterialResponse[]>(
      `/materials/subject/${subjectId}`
    ),
  upload: (formData: FormData, onProgress?: (percent: number) => void) =>
    axiosInstance.post<{ code?: number; result?: MaterialResponse } | MaterialResponse>(
      '/materials/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      }
    ),
  updateTitle: (materialId: string | number, title: string) =>
    axiosInstance.patch<{ code?: number; result?: MaterialResponse } | MaterialResponse>(
      `/materials/${materialId}/title`,
      { title }
    ),
  delete: (materialId: string | number) =>
    axiosInstance.delete(`/materials/${materialId}`),
}

// ===== Subjects =====
export interface SubjectResponse {
  id: number | string
  code: string
  name: string
  description?: string
}

export interface SubjectCreatePayload {
  code: string
  name: string
  description?: string
}

export interface SubjectUpdatePayload {
  code?: string
  name?: string
  description?: string
}

export const subjectApi = {
  getAll: () => axiosInstance.get<{ code?: number; result?: SubjectResponse[] } | SubjectResponse[]>('/subjects'),
  getById: (id: string | number) => axiosInstance.get<{ code?: number; result?: SubjectResponse } | SubjectResponse>(`/subjects/${id}`),
  create: (data: SubjectCreatePayload) =>
    axiosInstance.post<{ code?: number; result?: SubjectResponse } | SubjectResponse>('/subjects', data),
  update: (id: string | number, data: SubjectUpdatePayload) =>
    axiosInstance.put<{ code?: number; result?: SubjectResponse } | SubjectResponse>(`/subjects/${id}`, data),
  delete: (id: string | number) => axiosInstance.delete<{ code?: number; result?: string; message?: string } | string>(`/subjects/${id}`),
}

// ===== Subject Assignments (lecturer <-> subject) =====
// Backend contract is not available yet; these reject locally (no network call)
// and should be pointed at the real endpoints once documented.
export interface SubjectAssignment {
  id: number | string
  lecturerId: number | string
  lecturerUsername: string
  lecturerName: string
  subjectId: number | string
  subjectCode: string
  subjectName: string
  assignedAt?: string
}

export interface SubjectAssignmentCreatePayload {
  lecturerId: number | string
  subjectIds: (number | string)[]
}

export const subjectAssignmentApi = {
  getAll: (): Promise<{ data: SubjectAssignment[] | { result?: SubjectAssignment[] } }> =>
    unsupported('Subject assignment'),
  create: (_data: SubjectAssignmentCreatePayload): Promise<{ data: unknown }> =>
    unsupported('Subject assignment'),
  remove: (_id: number | string): Promise<{ data: unknown }> =>
    unsupported('Subject assignment'),
}

// ===== Admin =====
export const adminApi = {
  // Aggregate stats and activities from existing endpoints since backend might not have dedicated ones
  getAiConfig: () => axiosInstance.get('/admin/ai-config'),
}
