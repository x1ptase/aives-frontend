export type Role = 'Admin' | 'Lecturer' | 'Student' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'admin' | 'instructor' | 'student'

export interface User {
  id: number | string
  name: string
  username: string
  email: string
  role: Role
  createdAt: string
  password?: string
  avatar?: string
}

// Backend user DTO (GET /users, POST /auth/signup ...), shared by the auth and users modules
export interface BackendUserResponse {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  createdAt: string
}
