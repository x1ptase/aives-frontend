import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/config/axios'
import { setupAuthMock } from './authMock'

let mockInstance: MockAdapter | null = null

/**
 * Initialize Mock API Adapter for Axios.
 * Configured with delayResponse = 800ms to simulate real network latency.
 * onNoMatch: 'passthrough' allows unmocked endpoints to pass through normally.
 */
export const initMockApi = (): MockAdapter => {
  if (mockInstance) {
    return mockInstance
  }

  mockInstance = new MockAdapter(axiosInstance, {
    delayResponse: 800,
    onNoMatch: 'passthrough',
  })

  // Register mock endpoints
  setupAuthMock(mockInstance)

  console.info('[Mock API] Mock service initialized with 800ms delay')

  return mockInstance
}

export const getMockAdapter = (): MockAdapter | null => mockInstance

export * from './authMock'
