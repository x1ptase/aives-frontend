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
        email: username.trim(),
        password,
      })

      const { user, token, accessToken } = response.data
      const authToken = token || accessToken

      // Save user profile and auth token into Zustand store (synced to localStorage)
      setUser(user, authToken)

      // Navigate based on user role
      switch (user.role) {
        case 'ADMIN':
        case 'admin':
          navigate('/admin-dashboard')
          break
        case 'LECTURER':
        case 'lecturer':
        case 'instructor':
          navigate('/lecturer-dashboard')
          break
        case 'STUDENT':
        case 'student':
          navigate('/student-dashboard')
          break
        default:
          navigate('/admin-dashboard')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message)
      } else {
        setErrorMessage('Invalid username or password')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Central Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8">
        {/* Card Header: Logo, Title, Subtitle */}
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

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Field */}
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

          {/* Password Field */}
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
              {/* Password visibility toggle */}
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

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="text-sm text-red-500 font-medium text-center bg-red-50 py-2 px-3 rounded-lg border border-red-200 animate-fadeIn">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
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

        {/* Mock API Test Accounts Helper Box */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
          <p className="font-semibold text-gray-600 mb-2">Mock API Test Accounts (password: abc123):</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setUsername('admin1')
                setPassword('abc123')
                setErrorMessage('')
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('lecturer1')
                setPassword('abc123')
                setErrorMessage('')
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Lecturer
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('user1')
                setPassword('abc123')
                setErrorMessage('')
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('user1')
                setPassword('wrong_password')
                setErrorMessage('')
              }}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
            >
              Test 401 Error
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
