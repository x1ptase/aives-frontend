import axiosInstance from '@/config/axios'

// ===== Auth =====
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    axiosInstance.post('/auth/login', credentials),

  logout: () => axiosInstance.post('/auth/logout'),

  getProfile: () => axiosInstance.get('/auth/profile'),
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
