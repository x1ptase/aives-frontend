import axiosInstance from '@/shared/api/axios'

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
