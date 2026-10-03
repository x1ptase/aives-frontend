import { useState, useMemo } from 'react'
import { User, Role } from '@/types'
import HeaderActionBar from '@/components/users/HeaderActionBar'
import DataTable from '@/components/users/DataTable'
import Pagination from '@/components/users/Pagination'
import AddUserModal from '@/components/users/AddUserModal'
import UserDetailModal from '@/components/users/UserDetailModal'

const ALL_USERS: User[] = [
    { id: 2, name: 'Nguyễn Văn An', username: 'AnNV12', email: 'AnNV12@fpt.edu.vn', role: 'Lecturer', createdAt: '2023-09-01' },
    { id: 3, name: 'Trần Thị Bích', username: 'BichTTSE218473', email: 'BichTTSE218473@fpt.edu.vn', role: 'Student', createdAt: '2023-09-05' },
    { id: 1, name: 'Administrator', username: 'admin', email: 'admin@aives.edu.vn', role: 'Admin', createdAt: '2023-01-15' },
    { id: 4, name: 'Phạm Minh Khoa', username: 'KhoaPMIA201948', email: 'KhoaPMIA201948@fpt.edu.vn', role: 'Student', createdAt: '2023-10-12' },
    { id: 5, name: 'Đỗ Thị Lan', username: 'LanDT5', email: 'LanDT5@fpt.edu.vn', role: 'Lecturer', createdAt: '2023-08-22' },
    { id: 6, name: 'Hoàng Văn Minh', username: 'MinhHVSE185739', email: 'MinhHVSE185739@fpt.edu.vn', role: 'Student', createdAt: '2023-11-01' },
    { id: 7, name: 'Võ Thị Ngọc', username: 'NgocVTIS192038', email: 'NgocVTIS192038@fpt.edu.vn', role: 'Student', createdAt: '2024-01-10' },
    { id: 8, name: 'Bùi Quang Hiệu', username: 'HieuBQ77', email: 'HieuBQ77@fpt.edu.vn', role: 'Lecturer', createdAt: '2023-05-18' },
    { id: 9, name: 'Đinh Thị Thu', username: 'ThuDTGD213948', email: 'ThuDTGD213948@fpt.edu.vn', role: 'Student', createdAt: '2023-12-05' },
    { id: 10, name: 'Lý Văn Cường', username: 'CuongLVIA189234', email: 'CuongLVIA189234@fpt.edu.vn', role: 'Student', createdAt: '2024-02-20' },
]

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
    const [usersList, setUsersList] = useState<User[]>(ALL_USERS)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState<Set<string | number>>(new Set())
    const [detailTarget, setDetailTarget] = useState<string | number | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [sortCol, setSortCol] = useState<'name' | 'role' | 'createdAt'>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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
            s.has(id) ? s.delete(id) : s.add(id)
            return s
        })
    }

    const counts = useMemo(() => ({
        total: usersList.length,
        students: usersList.filter(u => u.role === 'Student').length,
        lecturers: usersList.filter(u => u.role === 'Lecturer').length,
        admins: usersList.filter(u => u.role === 'Admin').length,
    }), [usersList])

    const handleAddUser = (newUser: { name: string, username: string, email: string, role: Role, password?: string }) => {
        const id = Math.max(...usersList.map(u => typeof u.id === 'number' ? u.id : parseInt(u.id) || 0), 0) + 1
        const createdAt = new Date().toISOString().split('T')[0]
        
        const user: User = {
            id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            username: newUser.username,
            createdAt,
            password: newUser.password || '******'
        }
        setUsersList(prev => [user, ...prev])
    }

    const handleDeleteUser = (id: string | number) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsersList(prev => prev.filter(u => u.id !== id))
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f1f5f9]">
            <HeaderActionBar
                counts={counts}
                onAddUser={() => setShowAddModal(true)}
            />

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
                    />
                )
            })()}
        </div>
    )
}
