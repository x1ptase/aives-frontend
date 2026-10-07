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

// ===== Users =====
export const userApi = {
  getMyInfo: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse }>('/users/my-info'),

  getAll: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse[] }>('/users'),

  update: (id: string | number, data: UserUpdatePayload) =>
    axiosInstance.put<{ code: number; result: BackendUserResponse }>(`/users/${id}`, data),

  delete: (id: string | number) =>
    axiosInstance.delete<{ code: number; result: string }>(`/users/${id}`),

  changePassword: (_data: any) =>
    Promise.reject(new Error("Password change API endpoint is not yet implemented by the backend contract. UI is ready.")),

  googleLink: (_token: string) =>
    Promise.reject(new Error("Google Linking API endpoint is not yet implemented by the backend contract.")),
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

  getBySubject: (subjectId: string | number) =>
    axiosInstance.get('/questions', { params: { subject_id: subjectId } }),

  getById: (id: string) => axiosInstance.get(`/questions/${id}`),

  create: (data: any) => axiosInstance.post('/questions', data),

  update: (id: string | number, data: any) => axiosInstance.put(`/questions/${id}`, data),

  delete: (id: string | number) => axiosInstance.delete(`/questions/${id}`),

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
  getById: (id: string | number) => axiosInstance.get(`/exam-sessions/${id}`),
  create: (data: any) => axiosInstance.post('/exam-sessions', data),
  update: (id: string | number, data: any) => axiosInstance.put(`/exam-sessions/${id}`, data),
  delete: (id: string | number) => axiosInstance.delete(`/exam-sessions/${id}`),
}

// ===== Student Exams =====
export const studentExamApi = {
  getAll: () => axiosInstance.get('/student-exams'),
  assign: (_data: any) => Promise.reject(new Error("Assignment API endpoint is not defined in frontend contract. UI is ready.")),
  unassign: (_id: string | number) => Promise.reject(new Error("Unassign API endpoint is not defined in frontend contract. UI is ready.")),
}

// ===== Learning Materials =====
export const learningMaterialApi = {
  getAll: () => axiosInstance.get('/learning-materials'),
}

// ===== Subjects =====
export const subjectApi = {
  getAll: () => axiosInstance.get('/subjects'),
  getById: (id: string | number) => axiosInstance.get(`/subjects/${id}`),
  create: (data: { code: string; name: string; description?: string }) =>
    axiosInstance.post('/subjects', data),
  update: (id: string | number, data: { code?: string; name?: string; description?: string }) =>
    axiosInstance.put(`/subjects/${id}`, data),
  delete: (id: string | number) => axiosInstance.delete(`/subjects/${id}`),
}

// ===== Admin =====
export const adminApi = {
  // Aggregate stats and activities from existing endpoints since backend might not have dedicated ones
  getAiConfig: () => axiosInstance.get('/admin/ai-config'),
}
