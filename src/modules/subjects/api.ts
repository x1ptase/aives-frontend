import axiosInstance from '@/shared/api/axios'
import type { PageResult } from '@/shared/api/types'

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
export interface SubjectAssignment {
  id: number | string
  lecturerId: number | string
  lecturerUsername: string
  lecturerFullName?: string
  subject: SubjectResponse
}

// Payload shared by POST /lecturer-subject-assignments and /revocations (max 100 subjectIds)
export interface SubjectAssignmentChangePayload {
  lecturerId: number | string
  subjectIds: (number | string)[]
}

export interface AssignmentChangeResult {
  lecturerId: number | string
  changedSubjectIds: (number | string)[]
  unchangedSubjectIds: (number | string)[]
}

const ASSIGNMENT_PAGE_SIZE = 100

export const subjectAssignmentApi = {
  getPage: (params: { lecturerId?: number | string; page?: number; size?: number } = {}) =>
    axiosInstance.get<{ code?: number; result?: PageResult<SubjectAssignment> }>('/lecturer-subject-assignments', {
      params: { size: ASSIGNMENT_PAGE_SIZE, ...params },
    }),
  assign: (data: SubjectAssignmentChangePayload) =>
    axiosInstance.post<{ code?: number; message?: string; result?: AssignmentChangeResult }>(
      '/lecturer-subject-assignments',
      data
    ),
  revoke: (data: SubjectAssignmentChangePayload) =>
    axiosInstance.post<{ code?: number; message?: string; result?: AssignmentChangeResult }>(
      '/lecturer-subject-assignments/revocations',
      data
    ),
  getMySubjectsPage: (page = 0) =>
    axiosInstance.get<{ code?: number; result?: PageResult<SubjectResponse> }>(
      '/lecturer-subject-assignments/my-subjects',
      { params: { page, size: ASSIGNMENT_PAGE_SIZE } }
    ),
}

// Walks every page of a paged endpoint (size 100) and returns all items.
const fetchAllPages = async <T>(
  fetchPage: (page: number) => Promise<{ data: { result?: PageResult<T> } }>
): Promise<T[]> => {
  const items: T[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const res = await fetchPage(page)
    const result = res.data?.result
    items.push(...(result?.items ?? []))
    totalPages = result?.totalPages ?? 0
    page += 1
  }
  return items
}

export const getAllSubjectAssignments = (lecturerId?: number | string) =>
  fetchAllPages<SubjectAssignment>(page => subjectAssignmentApi.getPage({ lecturerId, page }))

// Subjects assigned to the logged-in lecturer (all pages)
export const getMySubjects = () => fetchAllPages<SubjectResponse>(subjectAssignmentApi.getMySubjectsPage)
