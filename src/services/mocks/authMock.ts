import type MockAdapter from 'axios-mock-adapter'
import type { User } from '@/types'

// Standard mock accounts matching backend specs
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
      identifiers: ['admin1', 'admin1@aives.edu.vn'],
      passwords: ['abc123'],
    },
    user: {
      id: 'u-admin-001',
      email: 'admin1@aives.edu.vn',
      name: 'System Administrator',
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    },
    token: 'mock-jwt-token-admin-aives-2026',
  },
  {
    credentials: {
      identifiers: ['lecturer1', 'lecturer1@aives.edu.vn'],
      passwords: ['abc123'],
    },
    user: {
      id: 'u-lect-002',
      email: 'lecturer1@aives.edu.vn',
      name: 'Dr. Lecturer',
      role: 'LECTURER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lecturer',
    },
    token: 'mock-jwt-token-lecturer-aives-2026',
  },
  {
    credentials: {
      identifiers: ['user1', 'user1@aives.edu.vn'],
      passwords: ['abc123'],
    },
    user: {
      id: 'u-stud-003',
      email: 'user1@aives.edu.vn',
      name: 'Student User',
      role: 'STUDENT',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
    },
    token: 'mock-jwt-token-student-aives-2026',
  },
]

export const setupAuthMock = (mock: MockAdapter) => {
  // POST /auth/login - Mock login handler
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
            message: 'Please provide both username/email and password',
          },
        ]
      }

      // Find matching mock account
      const matchedAccount = MOCK_USERS.find((item) =>
        item.credentials.identifiers.includes(rawIdentifier),
      )

      // Validate password
      if (matchedAccount && matchedAccount.credentials.passwords.includes(rawPassword)) {
        return [
          200,
          {
            status: 200,
            message: 'Login successful',
            token: matchedAccount.token,
            accessToken: matchedAccount.token,
            tokenType: 'Bearer',
            user: matchedAccount.user,
          },
        ]
      }

      // Return 401 error when account is not found or password is incorrect
      return [
        401,
        {
          status: 401,
          message: 'Invalid username or password',
        },
      ]
    } catch {
      return [
        400,
        {
          status: 400,
          message: 'Invalid request payload',
        },
      ]
    }
  })

  // POST /auth/logout - Mock logout handler
  mock.onPost(/\/auth\/logout/).reply(() => {
    return [
      200,
      {
        status: 200,
        message: 'Logged out successfully',
      },
    ]
  })

  // GET /auth/profile - Mock current profile by authorization bearer token
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
        message: 'Invalid or expired session token',
      },
    ]
  })
}
