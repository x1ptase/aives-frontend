/** Phân trang server dùng chung trong module, không tải/lọc toàn bộ ngân hàng ở client. */
export default function ExamPagination({ page, totalPages, totalElements, busy, onChange }: {
  /** Chỉ số trang từ 0. */ page: number
  /** Số trang backend trả về. */ totalPages: number
  /** Tổng bản ghi đúng phạm vi quyền. */ totalElements: number
  /** Khóa thao tác khi đang tải hoặc ghi. */ busy: boolean
  /** Chọn trang mới. */ onChange: (page: number) => void
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 text-sm text-slate-600">
    <span>{totalElements} record(s) · Page {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
    <div className="flex gap-2">
      <button type="button" disabled={busy || page === 0} onClick={() => onChange(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
      <button type="button" disabled={busy || page + 1 >= totalPages} onClick={() => onChange(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
    </div>
  </div>
}
