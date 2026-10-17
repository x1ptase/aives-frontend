import { useState } from 'react'
import { Role } from '@/shared/types'

interface AddUserModalProps {
  onClose: () => void
  onAdd: (user: { name: string; username: string; email: string; role: Role; password?: string }) => Promise<void> | void
}

export default function AddUserModal({ onClose, onAdd }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('Lecturer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !username.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.')
      return
    }

    setLoading(true)
    try {
      await onAdd({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        role,
        password: password.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      let msg = 'Failed to create user.'
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; result?: { message?: string } } } }).response
        msg = res?.data?.message || res?.data?.result?.message || msg
      } else if (err instanceof Error) {
        msg = err.message
      }

      if (msg.includes('USER_EXISTED') || msg.toLowerCase().includes('user already')) {
        setError('Username already exists. Please choose another username.')
      } else if (msg.includes('EMAIL_EXISTED') || msg.toLowerCase().includes('email already')) {
        setError('Email already exists. Please use another email.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="m-auto bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Create User Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Admin can create Lecturer or Student accounts</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50"
              placeholder="e.g. Nguyen Van An"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50"
              placeholder="e.g. annguyenvan2005"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50"
              placeholder="e.g. annguyenvan2005@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              disabled={loading}
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 bg-white"
            >
              <option value="Lecturer">Lecturer</option>
              <option value="Student">Student</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              disabled={loading}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50"
              placeholder="Leave blank to auto-generate 8-character password"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              ✉️ An email with login credentials will be automatically sent to the user upon creation.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
