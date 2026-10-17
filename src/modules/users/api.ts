import axiosInstance from '@/shared/api/axios'
import type { BackendUserResponse } from '@/shared/types'

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
    axiosInstance.get<{ code: number; result: BackendUserResponse }>('/users/myInfo'),

  getAll: () =>
    axiosInstance.get<{ code: number; result: BackendUserResponse[] }>('/users'),

  create: (data: UserCreatePayload) =>
    axiosInstance.post<{ code: number; message?: string; result: BackendUserResponse }>('/users/create', data, {
      timeout: 60000, // SMTP mail sending can take 10-20s depending on network
    }),

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
