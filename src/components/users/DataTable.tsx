import { User, Role } from '@/types'
import { SearchIcon, ChevronDown, EditIcon, TrashIcon, MoreIcon } from '@/components/common/Icons'

interface DataTableProps {
  users: User[]
  search: string
  setSearch: (s: string) => void
  roleFilter: 'All' | Role
  setRoleFilter: (r: 'All' | Role) => void
  sortCol: 'name' | 'role' | 'createdAt'
  sortDir: 'asc' | 'desc'
  onSort: (col: 'name' | 'role' | 'createdAt') => void
  selected: Set<number>
  onToggleSelectAll: () => void
  onToggleSelect: (id: number) => void
  onDeleteRequest: (id: number) => void
  ROLE_COLORS: Record<Role, { bg: string; text: string; ring: string }>
  getAvatarColor: (id: number) => string
  getInitials: (name: string) => string
}

export default function DataTable({
  users, search, setSearch, roleFilter, setRoleFilter, sortCol, sortDir, onSort,
  selected, onToggleSelectAll, onToggleSelect, onDeleteRequest,
  ROLE_COLORS, getAvatarColor, getInitials
}: DataTableProps) {
  const allSelected = users.length > 0 && users.every(u => selected.has(u.id))

  const SortArrow = ({ col }: { col: 'name' | 'role' | 'createdAt' }) => (
    <span className="ml-1 inline-flex flex-col" style={{ gap: 1 }}>
      <svg viewBox="0 0 6 4" className="w-2 h-1.5" style={{ opacity: sortCol === col && sortDir === 'asc' ? 1 : 0.3 }}>
        <path d="M3 0L6 4H0z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 6 4" className="w-2 h-1.5" style={{ opacity: sortCol === col && sortDir === 'desc' ? 1 : 0.3 }}>
        <path d="M3 4L0 0H6z" fill="currentColor" />
      </svg>
    </span>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Filters bar */}
      <div className="flex-shrink-0 px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Search name, email, or username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:bg-white transition-all"
            style={{ '--tw-ring-color': '#bfdbfe' } as React.CSSProperties}
          />
        </div>
        <div className="w-px h-5 bg-slate-200 flex-shrink-0"></div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none focus:ring-2 cursor-pointer transition-all"
            style={{ '--tw-ring-color': '#bfdbfe' } as React.CSSProperties}
          >
            <option value="All">All Roles</option>
            <option value="Student">Student</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Admin">Admin</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown /></span>
        </div>
        {(search || roleFilter !== 'All') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('All') }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          {selected.size > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">{selected.size} selected</span>
          )}
          <span>{users.length} result{users.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }} className="border-b border-slate-200">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => onSort('name')}>
                  <span className="flex items-center gap-1">Name <SortArrow col="name" /></span>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Password</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => onSort('createdAt')}>
                  <span className="flex items-center gap-1">Created At <SortArrow col="createdAt" /></span>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => onSort('role')}>
                  <span className="flex items-center gap-1">Role <SortArrow col="role" /></span>
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">No users match your criteria.</td>
                </tr>
              ) : users.map((user) => {
                const rc = ROLE_COLORS[user.role]
                const isChecked = selected.has(user.id)
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group" style={{ backgroundColor: isChecked ? '#eff6ff' : undefined }}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={isChecked} onChange={() => onToggleSelect(user.id)} className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: getAvatarColor(user.id) }}>{getInitials(user.name)}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">{user.name}</div>
                          <div className="text-[11px] text-slate-400">ID: {String(user.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{user.username}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{user.email}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 tracking-widest">{user.password || '******'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: rc.bg, color: rc.text, outline: `1px solid ${rc.ring}` }}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit user"><EditIcon /></button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete user" onClick={() => onDeleteRequest(user.id)}><TrashIcon /></button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title="More options"><MoreIcon /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
