import type MockAdapter from 'axios-mock-adapter'
import type { User } from '@/types'

// Danh sách tài khoản mẫu chuẩn theo User interface
export const MOCK_USERS: Array<{
  credentials: {
    identifiers: string[]
    passwords: string[]
  }
  user: User
  token: string
}> = [
    {
      credentials: {
        identifiers: ['admin', 'admin@aives.edu.vn'],
        passwords: ['123456', 'password123', 'admin123'],
      },
      user: {
        id: 'u-admin-001',
        email: 'admin@aives.edu.vn',
        name: 'Quản trị viên Hệ thống',
        username: 'admin',
        role: 'admin',
        createdAt: '2026-01-01',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      },
      token: 'mock-jwt-token-admin-aives-2026',
    },
    {
      credentials: {
        identifiers: ['instructor', 'lecturer', 'giangvien', 'lecturer@aives.edu.vn'],
        passwords: ['123456', 'password123', 'lecturer123'],
      },
      user: {
        id: 'u-inst-002',
        email: 'lecturer@aives.edu.vn',
        name: 'TS. Nguyễn Văn A',
        username: 'lecturer',
        role: 'instructor',
        createdAt: '2026-01-01',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Instructor',
      },
      token: 'mock-jwt-token-instructor-aives-2026',
    },
    {
      credentials: {
        identifiers: ['student', 'sinhvien', 'student@aives.edu.vn'],
        passwords: ['123456', 'password123', 'student123'],
      },
      user: {
        id: 'u-stud-003',
        email: 'student@aives.edu.vn',
        name: 'Trần Thị B',
        username: 'student',
        role: 'student',
        createdAt: '2026-01-01',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
      },
      token: 'mock-jwt-token-student-aives-2026',
    },
  ]

export const setupAuthMock = (mock: MockAdapter) => {
  // POST /auth/login - Xử lý đăng nhập mock
  mock.onPost(/\/auth\/login/).reply((config) => {
    try {
      const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
      const rawIdentifier = (data.email || data.username || '').toString().trim().toLowerCase()
      const rawPassword = (data.password || '').toString().trim()

      if (!rawIdentifier || !rawPassword) {
        return [
          400,
          {
            status: 400,
            message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu',
          },
        ]
      }

      // Tìm tài khoản phù hợp
      const matchedAccount = MOCK_USERS.find((item) =>
        item.credentials.identifiers.includes(rawIdentifier),
      )

      // Kiểm tra mật khẩu
      if (matchedAccount && matchedAccount.credentials.passwords.includes(rawPassword)) {
        return [
          200,
          {
            status: 200,
            message: 'Đăng nhập thành công',
            token: matchedAccount.token,
            accessToken: matchedAccount.token,
            tokenType: 'Bearer',
            user: matchedAccount.user,
          },
        ]
      }

      // Trả về lỗi 401 khi tài khoản không tồn tại hoặc sai mật khẩu
      return [
        401,
        {
          status: 401,
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
        },
      ]
    } catch {
      return [
        400,
        {
          status: 400,
          message: 'Dữ liệu yêu cầu không hợp lệ',
        },
      ]
    }
  })

  // POST /auth/logout - Xử lý đăng xuất mock
  mock.onPost(/\/auth\/logout/).reply(() => {
    return [
      200,
      {
        status: 200,
        message: 'Đăng xuất thành công',
      },
    ]
  })

  // GET /auth/profile - Mock lấy thông tin user hiện tại qua header token
  mock.onGet(/\/auth\/profile/).reply((config) => {
    const authHeader = config.headers?.Authorization || config.headers?.authorization
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/, '') : ''

    const matchedAccount = MOCK_USERS.find((item) => item.token === token)
    if (matchedAccount) {
      return [
        200,
        {
          status: 200,
          user: matchedAccount.user,
        },
      ]
    }

    return [
      401,
      {
        status: 401,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
      },
    ]
  })
}
