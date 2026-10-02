import axiosInstance from '@/config/axios'
import type { User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  status: number
  message?: string
  token: string
  accessToken: string
  tokenType: string
  user: User
}

// ===== Auth =====
export const authApi = {
  login: (credentials: LoginPayload) =>
    axiosInstance.post<AuthResponse>('/auth/login', credentials),

  logout: () => axiosInstance.post<{ status: number; message: string }>('/auth/logout'),

  getProfile: () => axiosInstance.get<{ status: number; user: User }>('/auth/profile'),
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

// ===== Admin =====
export const adminApi = {
  getStats: () => axiosInstance.get('/admin/stats'),
  getRecentActivity: () => axiosInstance.get('/admin/recent-activity'),
  getAiConfig: () => axiosInstance.get('/admin/ai-config'),
}
