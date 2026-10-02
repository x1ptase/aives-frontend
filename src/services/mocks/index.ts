import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/config/axios'
import { setupAuthMock } from './authMock'
import { setupAdminMock } from './adminMock'

let mockInstance: MockAdapter | null = null

/**
 * Khởi tạo Mock API Adapter cho Axios.
 * Cấu hình delayResponse = 800ms để giả lập độ trễ mạng thực tế.
 * onNoMatch: 'passthrough' cho phép các endpoint chưa mock vẫn gọi bình thường.
 */
export const initMockApi = (): MockAdapter => {
  if (mockInstance) {
    return mockInstance
  }

  mockInstance = new MockAdapter(axiosInstance, {
    delayResponse: 800,
    onNoMatch: 'passthrough',
  })

  // Đăng ký các mock endpoints
  setupAuthMock(mockInstance)
  setupAdminMock(mockInstance)

  console.info('[Mock API] Mock service initialized with 800ms delay')

  return mockInstance
}

export const getMockAdapter = (): MockAdapter | null => mockInstance

export * from './authMock'
