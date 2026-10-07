import { useState, useEffect } from 'react'
import { userApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

interface ProfileData {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
  Admin: 'Administrator',
  Lecturer: 'Lecturer',
  Student: 'Student',
  admin: 'Administrator',
  instructor: 'Lecturer',
  student: 'Student',
}

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  ADMIN: { bg: '#faf5ff', text: '#7c3aed', ring: '#ddd6fe', gradient: 'linear-gradient(135deg,#2563eb,#7c3aed)' },
  Admin: { bg: '#faf5ff', text: '#7c3aed', ring: '#ddd6fe', gradient: 'linear-gradient(135deg,#2563eb,#7c3aed)' },
  LECTURER: { bg: '#f0fdf4', text: '#15803d', ring: '#bbf7d0', gradient: 'linear-gradient(135deg,#0369a1,#2563eb)' },
  Lecturer: { bg: '#f0fdf4', text: '#15803d', ring: '#bbf7d0', gradient: 'linear-gradient(135deg,#0369a1,#2563eb)' },
  STUDENT: { bg: '#eff6ff', text: '#1d4ed8', ring: '#bfdbfe', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  Student: { bg: '#eff6ff', text: '#1d4ed8', ring: '#bfdbfe', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
}

const DEFAULT_ROLE_STYLE = { bg: '#f1f5f9', text: '#64748b', ring: '#e2e8f0', gradient: 'linear-gradient(135deg,#64748b,#475569)' }

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Profile() {
  const authUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const token = useAuthStore((state) => state.token)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)

  // Password Change state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpError, setCpError] = useState('')
  const [cpSuccess, setCpSuccess] = useState('')
  const [cpSaving, setCpSaving] = useState(false)
  const [showCpCurrent, setShowCpCurrent] = useState(false)
  const [showCpNew, setShowCpNew] = useState(false)
  const [showCpConfirm, setShowCpConfirm] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Google Linking state
  const [isGoogleLinking, setIsGoogleLinking] = useState(false)
  const [googleLinkError, setGoogleLinkError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setFetchError('')
      try {
        const res = await userApi.getMyInfo()
        if (res.data?.result) {
          setProfile(res.data.result)
        } else {
          setFetchError('Could not load profile data.')
        }
      } catch {
        setFetchError('Could not load profile. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleEditClick = () => {
    if (!profile) return
    setEditFullName(profile.fullName || '')
    setEditEmail(profile.email || '')
    setSaveError('')
    setSaveSuccess('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setSaveError('')
    setSaveSuccess('')
  }

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')

    if (!editFullName.trim()) {
      setSaveError('Full name is required.')
      return
    }
    if (!editEmail.trim() || !validateEmail(editEmail)) {
      setSaveError('Please enter a valid email address.')
      return
    }
    if (!profile) return

    setSaving(true)
    try {
      const updatePayload: { fullName?: string; email?: string } = {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
      }
      // NOTE: Password change is not supported by userApi.update (no password field in UserUpdatePayload).
      // If backend adds password support, add it here.

      const res = await userApi.update(profile.id, updatePayload)
      const updated = res.data?.result

      const newProfile: ProfileData = {
        ...profile,
        fullName: updated?.fullName || editFullName.trim(),
        email: updated?.email || editEmail.trim(),
      }
      setProfile(newProfile)

      // Sync auth store display name
      if (authUser && token) {
        setUser(
          {
            ...authUser,
            name: newProfile.fullName,
            email: newProfile.email,
          },
          token,
        )
      }

      setSaveSuccess('Profile updated successfully.')
      setIsEditing(false)
    } catch (err: unknown) {
      let msg = 'Failed to update profile.'
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; result?: { message?: string } } } }).response
        msg = res?.data?.message || res?.data?.result?.message || msg
      } else if (err instanceof Error) {
        msg = err.message
      }
      if (msg.includes('EMAIL_EXISTED') || msg.toLowerCase().includes('email already')) {
        setSaveError('This email is already in use. Please use a different email.')
      } else {
        setSaveError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const roleStyle = profile ? (ROLE_COLORS[profile.role] || DEFAULT_ROLE_STYLE) : DEFAULT_ROLE_STYLE
  const roleLabel = profile ? (ROLE_LABELS[profile.role] || profile.role) : ''

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setCpError('')
    setCpSuccess('')
    if (!cpCurrent) {
      setCpError('Current password is required.')
      return
    }
    if (!cpNew) {
      setCpError('New password is required.')
      return
    }
    if (cpNew.length < 6) {
      setCpError('New password must be at least 6 characters.')
      return
    }
    if (cpNew !== cpConfirm) {
      setCpError('New passwords do not match.')
      return
    }

    setCpSaving(true)
    try {
      await userApi.changePassword({ currentPassword: cpCurrent, newPassword: cpNew })
      setCpSuccess('Password changed successfully.')
      setIsChangingPassword(false)
      setCpCurrent('')
      setCpNew('')
      setCpConfirm('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCpError(err.message)
      } else {
        setCpError('Failed to change password. Endpoint may be missing.')
      }
    } finally {
      setCpSaving(false)
    }
  }

  const handleGoogleLink = async () => {
    setIsGoogleLinking(true)
    setGoogleLinkError('')
    try {
      await userApi.googleLink('dummy_token')
    } catch (err: any) {
      setGoogleLinkError(err.message || 'Google linking is unavailable.')
    } finally {
      setIsGoogleLinking(false)
    }
  }

  const formattedCreatedAt = profile?.createdAt
    ? (() => {
        const d = new Date(profile.createdAt)
        return isNaN(d.getTime()) ? profile.createdAt : d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
      })()
    : '—'

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#f1f5f9]">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">View and manage your personal account information.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-slate-500 text-sm">Loading profile…</span>
            </div>
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
            <div className="text-red-500 font-medium text-sm">{fetchError}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Profile Card */}
        {!loading && !fetchError && profile && (
          <>
            {/* Avatar + Role Banner */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="h-24 w-full"
                style={{ background: roleStyle.gradient }}
              />
              <div className="px-8 pb-6">
                <div className="flex items-end gap-4 -mt-10 mb-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-4 ring-white flex-shrink-0"
                    style={{ background: roleStyle.gradient }}
                  >
                    {getInitials(profile.fullName || profile.username)}
                  </div>
                  <div className="mb-1">
                    <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {profile.fullName || profile.username}
                    </h2>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1"
                      style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, outline: `1px solid ${roleStyle.ring}` }}
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success message */}
            {saveSuccess && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl font-medium">
                ✓ {saveSuccess}
              </div>
            )}

            {/* Info / Edit Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Account Information
                </h3>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Profile
                  </button>
                )}
              </div>

              {/* View mode */}
              {!isEditing && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</div>
                      <div className="text-sm font-semibold text-slate-800">{profile.fullName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</div>
                      <div className="text-sm font-medium text-slate-600 font-mono">{profile.username || '—'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Username cannot be changed</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</div>
                      <div className="text-sm font-medium text-slate-700">{profile.email || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role</div>
                      <div className="text-sm font-medium text-slate-700">{roleLabel}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Role cannot be changed</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Member Since</div>
                      <div className="text-sm font-medium text-slate-700">{formattedCreatedAt}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User ID</div>
                      <div className="text-sm font-medium text-slate-500 font-mono">#{String(profile.id).padStart(4, '0')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit mode */}
              {isEditing && (
                <form onSubmit={handleSave} className="p-6 space-y-5">
                  {saveError && (
                    <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      {saveError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={saving}
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 transition-all"
                        placeholder="Your full name"
                      />
                    </div>

                    {/* Username (read-only) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profile.username}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm cursor-not-allowed font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Username cannot be changed</p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        disabled={saving}
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>

                    {/* Role (read-only) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={roleLabel}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Role cannot be changed</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                    >
                      {saving && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Password Management
                </h3>
                {!isChangingPassword && (
                  <button
                    onClick={() => {
                      setIsChangingPassword(true)
                      setCpError('')
                      setCpSuccess('')
                      setCpCurrent('')
                      setCpNew('')
                      setCpConfirm('')
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {cpSuccess && !isChangingPassword && (
                <div className="p-4 border-b border-slate-100 text-sm text-green-700 bg-green-50 font-medium">
                  ✓ {cpSuccess}
                </div>
              )}

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                  {cpError && (
                    <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg font-medium">
                      {cpError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCpCurrent ? 'text' : 'password'}
                          required
                          disabled={cpSaving}
                          value={cpCurrent}
                          onChange={e => setCpCurrent(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCpCurrent(v => !v)}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showCpCurrent
                            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCpNew ? 'text' : 'password'}
                          required
                          disabled={cpSaving}
                          value={cpNew}
                          onChange={e => setCpNew(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50"
                          placeholder="New password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCpNew(v => !v)}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showCpNew
                            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCpConfirm ? 'text' : 'password'}
                          required
                          disabled={cpSaving}
                          value={cpConfirm}
                          onChange={e => setCpConfirm(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCpConfirm(v => !v)}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showCpConfirm
                            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      disabled={cpSaving}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={cpSaving}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                    >
                      {cpSaving && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {cpSaving ? 'Saving…' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Security &amp; Privacy
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-600">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Account Protected</div>
                    <div className="text-xs text-slate-400">Your account is secured with a password.</div>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-blue-600">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Role Assignment</div>
                    <div className="text-xs text-slate-400">Your role is managed by the system administrator.</div>
                  </div>
                </div>

                {/* Google Account Linking */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">Google Account</div>
                    <div className="text-xs text-slate-400 mb-2.5">Connect your Google account to sign in quickly.</div>
                    {googleLinkError && (
                      <div className="text-xs text-red-600 mb-2 font-medium bg-red-50 p-2 rounded border border-red-100">{googleLinkError}</div>
                    )}
                    <button
                      type="button"
                      onClick={handleGoogleLink}
                      disabled={isGoogleLinking}
                      className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGoogleLinking && (
                        <svg className="animate-spin h-3 w-3 text-slate-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {isGoogleLinking ? 'Connecting...' : 'Connect Google'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
