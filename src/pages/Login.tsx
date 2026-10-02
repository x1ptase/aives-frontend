import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import axios from 'axios'
import aivesLogo from '../assets/logo/logo-aives.jpg'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    try {
      const response = await authApi.login({
        username: username.trim(),
        password,
      })

      const result = response.data.result
      const authToken = result.token

      const user = {
        id: result.username,
        email: result.username,
        name: result.fullName,
        username: result.username,
        role: result.role as any,
      }

      // Lưu thông tin user và token vào Zustand store (tự động đồng bộ localStorage)
      setUser(user, authToken)

      // Điều hướng tương ứng theo vai trò (role) của tài khoản
      switch (result.role) {
        case 'ADMIN':
          navigate('/admin')
          break
        case 'LECTURER':
          navigate('/lecturer')
          break
        case 'STUDENT':
          navigate('/student')
          break
        default:
          setErrorMessage('Invalid user role.')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setErrorMessage('Unable to connect to the server. Please make sure the backend is running.')
        } else if (err.response.status === 401 || err.response.status === 403) {
          setErrorMessage('Invalid username or password.')
        } else if (err.response.data && (err.response.data.message || err.response.data.result?.message)) {
          setErrorMessage(err.response.data.message || err.response.data.result?.message)
        } else {
          setErrorMessage('An error occurred during sign in.')
        }
      } else {
        setErrorMessage('Invalid username or password.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Thẻ Card trung tâm */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8">
        {/* Header của Card: Logo, Tiêu đề, Phụ đề */}
        <div className="text-center mb-6">
          <img
            src={aivesLogo}
            alt="AIVES Logo"
            className="h-20 mx-auto object-contain mb-3"
          />
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-snug">
            AI-Powered Viva Examination System
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">
            Sign In
          </p>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Trường Tên đăng nhập */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="Enter your username"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          {/* Trường Mật khẩu */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="Enter your password"
                className="w-full pl-3.5 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
              />
              {/* Nút toggle hiển thị / ẩn mật khẩu */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Hiển thị thông báo lỗi khi đăng nhập thất bại */}
          {errorMessage && (
            <div className="text-sm text-red-500 font-medium text-center bg-red-50 py-2 px-3 rounded-lg border border-red-200 animate-fadeIn">
              {errorMessage}
            </div>
          )}

          {/* Nút Submit Đăng nhập */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
