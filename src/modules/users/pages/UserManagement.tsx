import { useState, useMemo, useEffect } from 'react'
import { User, Role } from '@/shared/types'
import { userApi } from '../api'
import HeaderActionBar from '../components/HeaderActionBar'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import AddUserModal from '../components/AddUserModal'
import UserDetailModal from '../components/UserDetailModal'

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    Student: { bg: '#eff6ff', text: '#1d4ed8', ring: '#bfdbfe' },
    Lecturer: { bg: '#f0fdf4', text: '#15803d', ring: '#bbf7d0' },
    Admin: { bg: '#faf5ff', text: '#7c3aed', ring: '#ddd6fe' },
}

const AVATAR_COLORS: string[] = [
    '#2563eb', '#7c3aed', '#0f766e', '#ea580c',
    '#0369a1', '#64748b', '#db2777', '#16a34a',
    '#9333ea', '#dc2626', '#ca8a04',
]

function getAvatarColor(id: string | number): string {
    const numId = typeof id === 'string' ? parseInt(id, 10) || 0 : id
    return AVATAR_COLORS[numId % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

const PAGE_SIZE = 8

export default function UserManagement() {
    const [usersList, setUsersList] = useState<User[]>([])
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState<Set<string | number>>(new Set())
    const [detailTarget, setDetailTarget] = useState<string | number | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [sortCol, setSortCol] = useState<'name' | 'role' | 'createdAt'>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadError('')
            try {
                const res = await userApi.getAll()
                if (res.data?.result && Array.isArray(res.data.result)) {
                    const mapped: User[] = res.data.result.map(u => ({
                        id: u.id,
                        name: u.fullName || u.username,
                        username: u.username,
                        email: u.email,
                        role: u.role === 'ADMIN' ? 'Admin' : u.role === 'LECTURER' ? 'Lecturer' : 'Student',
                        createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    }))
                    setUsersList(mapped)
                }
            } catch (err) {
                console.warn('Could not load users from backend API:', err)
                setLoadError('Could not load users. Please check your connection or try again.')
            }
        }
        fetchUsers()
    }, [])

    const filtered = useMemo(() => {
        let list = [...usersList]
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q)
            )
        }
        if (roleFilter !== 'All') list = list.filter(u => u.role === roleFilter)
        list.sort((a, b) => {
            let av = '', bv = ''
            if (sortCol === 'name') { av = a.name; bv = b.name }
            if (sortCol === 'role') { av = a.role; bv = b.role }
            if (sortCol === 'createdAt') { av = a.createdAt; bv = b.createdAt }
            return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        })
        return list
    }, [usersList, search, roleFilter, sortCol, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages) || 1
    const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    const handleSort = (col: typeof sortCol) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(col); setSortDir('asc') }
    }

    const allSelected = pageUsers.length > 0 && pageUsers.every(u => selected.has(u.id))

    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelected(prev => { const s = new Set(prev); pageUsers.forEach(u => s.delete(u.id)); return s })
        } else {
            setSelected(prev => { const s = new Set(prev); pageUsers.forEach(u => s.add(u.id)); return s })
        }
    }

    const handleToggleSelect = (id: string | number) => {
        setSelected(prev => {
            const s = new Set(prev)
            if (s.has(id)) {
                s.delete(id)
            } else {
                s.add(id)
            }
            return s
        })
    }

    const counts = useMemo(() => ({
        total: usersList.length,
        students: usersList.filter(u => u.role === 'Student').length,
        lecturers: usersList.filter(u => u.role === 'Lecturer').length,
        admins: usersList.filter(u => u.role === 'Admin').length,
    }), [usersList])

    const [successMessage, setSuccessMessage] = useState('')

    /**
     * Admin can create accounts for Lecturers and Students.
     * Backend automatically generates/hashes password and sends login credentials via email.
     */
    const handleAddUser = async (newUser: { name: string; username: string; email: string; role: Role; password?: string }) => {
        const roleCode = newUser.role === 'Lecturer' ? 'LECTURER' : 'STUDENT'
        const res = await userApi.create({
            fullName: newUser.name.trim(),
            username: newUser.username.trim(),
            email: newUser.email.trim(),
            roleCode,
            password: newUser.password?.trim() || undefined,
        })
        const created = res.data?.result
        if (created) {
            const mapped: User = {
                id: created.id,
                name: created.fullName || created.username,
                username: created.username,
                email: created.email,
                role: created.role === 'ADMIN' ? 'Admin' : created.role === 'LECTURER' ? 'Lecturer' : 'Student',
                createdAt: created.createdAt ? new Date(created.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            }
            setUsersList(prev => [mapped, ...prev])
            setSuccessMessage(`Account "${mapped.username}" created successfully! An email with credentials has been sent to ${mapped.email}.`)
            setTimeout(() => setSuccessMessage(''), 8000)
        }
    }

    /**
     * Admin can delete user accounts — this is a system-level operation supported by the API.
     */
    const handleDeleteUser = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
        try {
            await userApi.delete(id)
            setUsersList(prev => prev.filter(u => u.id !== id))
            setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
        } catch (err: unknown) {
            let msg = 'Failed to delete user.'
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const res = (err as { response?: { data?: { message?: string } } }).response
                msg = res?.data?.message || msg
            }
            if (typeof msg === 'string' && (msg.includes('foreign key constraint') || msg.includes('violates foreign key'))) {
                msg = 'Cannot delete this user because they are linked to existing subjects or system records. Please reassign or remove linked data first.'
            }
            alert(msg)
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f1f5f9]">
            <HeaderActionBar
                counts={counts}
                onAddUser={() => setShowAddModal(true)}
            />

            {successMessage && (
                <div className="mx-8 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold ml-4">
                        ✕
                    </button>
                </div>
            )}

            {loadError && (
                <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                    {loadError}
                </div>
            )}

            <DataTable
                users={pageUsers}
                search={search}
                setSearch={(val) => { setSearch(val); setPage(1) }}
                roleFilter={roleFilter}
                setRoleFilter={(val) => { setRoleFilter(val); setPage(1) }}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
                selected={selected}
                onToggleSelectAll={handleToggleSelectAll}
                onToggleSelect={handleToggleSelect}
                onDeleteRequest={handleDeleteUser}
                onDetailRequest={(id) => setDetailTarget(id)}
                // onEditRequest is intentionally NOT passed —
                // Admin must NOT edit another user's personal information.
                ROLE_COLORS={ROLE_COLORS}
                getAvatarColor={getAvatarColor}
                getInitials={getInitials}
            />

            <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />

            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddUser}
                />
            )}

            {detailTarget !== null && (() => {
                const detailUser = usersList.find(u => u.id === detailTarget)!
                return (
                    <UserDetailModal
                        user={detailUser}
                        avatarColor={getAvatarColor(detailUser.id)}
                        initials={getInitials(detailUser.name)}
                        onClose={() => setDetailTarget(null)}
                        // onEdit is intentionally NOT passed —
                        // Admin must NOT edit another user's personal information.
                    />
                )
            })()}
        </div>
    )
}
