import axiosInstance from '@/shared/api/axios'

// ===== Learning Materials =====
// Mirrors the backend MaterialUploadResponse, which is also what the list endpoint returns.
export interface MaterialResponse {
  id: number | string
  subjectId: number | string
  subjectCode?: string
  subjectName?: string
  title?: string
  fileName?: string
  storagePath?: string
  mimeType?: string
  totalChunks?: number
  processingStatus?: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED' | string
  uploadedBy?: string
  createdAt?: string
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
        timeout: 120000, // large files + server-side processing exceed the 10s default
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
