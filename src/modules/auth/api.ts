import axiosInstance from '@/shared/api/axios'
import type { BackendUserResponse, User } from '@/shared/types'

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
