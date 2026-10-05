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
}

// ===== Users =====
export const userApi = {
  getMyInfo: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse }>('/users/my-info'),

  getAll: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse[] }>('/users'),
}

// ===== Exams =====
export const examApi = {
  getAll: () => axiosInstance.get('/exams'),

  getById: (id: string) => axiosInstance.get(`/exams/${id}`),

  create: (data: unknown) => axiosInstance.post('/exams', data),

  update: (id: string, data: unknown) => axiosInstance.put(`/exams/${id}`, data),

  delete: (id: string) => axiosInstance.delete(`/exams/${id}`),
}

// ===== Questions =====
export const questionApi = {
  getAll: () => axiosInstance.get('/questions'),

  getById: (id: string) => axiosInstance.get(`/questions/${id}`),

  generate: (data: { topic: string; count: number }) =>
    axiosInstance.post('/questions/generate', data),
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
  getAll: () => axiosInstance.get('/exam-sessions'),
}

// ===== Student Exams =====
export const studentExamApi = {
  getAll: () => axiosInstance.get('/student-exams'),
}

// ===== Learning Materials =====
export const learningMaterialApi = {
  getAll: () => axiosInstance.get('/learning-materials'),
}

// ===== Admin =====
export const adminApi = {
  // Aggregate stats and activities from existing endpoints since backend might not have dedicated ones
  getAiConfig: () => axiosInstance.get('/admin/ai-config'),
}
