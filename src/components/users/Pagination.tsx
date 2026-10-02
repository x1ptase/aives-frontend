import { ChevronLeft, ChevronRight } from '@/components/common/Icons'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  const safePage = Math.min(page, totalPages) || 1
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-100 bg-[#f8fafc]">
      <div className="text-xs text-slate-400">
        Showing <strong className="text-slate-600">{startItem}</strong>–<strong className="text-slate-600">{endItem}</strong> of <strong className="text-slate-600">{totalItems}</strong> users
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={safePage === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="w-8 h-8 rounded-lg text-xs font-semibold border transition-all"
            style={p === safePage ? { backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' } : { backgroundColor: 'white', color: '#64748b', borderColor: '#e2e8f0' }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={safePage === totalPages || totalPages === 0}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}
