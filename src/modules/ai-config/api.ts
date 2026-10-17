import axiosInstance from '@/shared/api/axios'

// ===== Admin =====
export const adminApi = {
  // Aggregate stats and activities from existing endpoints since backend might not have dedicated ones
  getAiConfig: () => axiosInstance.get('/admin/ai-config'),
}
