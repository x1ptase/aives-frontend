import { createContext, useContext } from 'react'

/** Nội dung popup thuần văn bản, không render HTML từ máy chủ. */
export interface FeedbackMessage {
  /** Tiêu đề ngắn gọn bằng tiếng Việt. */ title: string
  /** Nội dung giải thích hoặc yêu cầu xác nhận. */ message: string
  /** Màu ngữ nghĩa, không quyết định quyền hoặc nghiệp vụ. */ tone?: 'info' | 'success' | 'error'
}

/** Hợp đồng xác nhận; hủy hoặc đóng popup không gửi yêu cầu ghi. */
export interface Confirmation extends FeedbackMessage {
  /** Nhãn thao tác cụ thể thay nút OK chung chung. */ confirmLabel?: string
}

/** Phản hồi dùng chung, mỗi trang có provider và hàng đợi riêng. */
export interface Feedback {
  /** Xếp thông báo vào hàng đợi để không mất lỗi hoặc kết quả đến đồng thời. */ notify: (message: FeedbackMessage) => void
  /** Chờ người dùng xác nhận; hủy hoặc rời trang trả false. */ confirm: (message: Confirmation) => Promise<boolean>
}

/** Context tồn tại ở gốc trang khi modal con đã đóng sau thành công. */
export const FeedbackContext = createContext<Feedback | null>(null)

/** Dùng popup ứng dụng thay cho alert/confirm của trình duyệt. */
export function useFeedback(): Feedback {
  const feedback = useContext(FeedbackContext)
  if (!feedback) throw new Error('Popup phải nằm trong FeedbackProvider.')
  return feedback
}
