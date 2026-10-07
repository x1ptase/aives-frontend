import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import axios from 'axios'
import aivesLogo from '../../assets/logo/logo-aives.jpg'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

export const Signin: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((state) => state.setUser)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clean up the location state so the message doesn't persist on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
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

  const handleGoogleSignin = async () => {
    setIsGoogleLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await authApi.googleSignIn('dummy_token')
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign In is currently unavailable.')
    } finally {
      setIsGoogleLoading(false)
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
        <form onSubmit={handleSignin} className="space-y-4">
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

          {/* Hiển thị thông báo lỗi/thành công */}
          {errorMessage && (
            <div className="text-sm text-red-500 font-medium text-center bg-red-50 py-2 px-3 rounded-lg border border-red-200 animate-fadeIn">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="text-sm text-green-600 font-medium text-center bg-green-50 py-2 px-3 rounded-lg border border-green-200 animate-fadeIn">
              {successMessage}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-medium text-gray-400 uppercase tracking-wider">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleSignin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </button>
          </div>
          
          {/* Link sang trang Sign Up */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Signin
