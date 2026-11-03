import axios from 'axios'
import i18n from '@/shared/i18n'
import { subjectAssignmentApi, type SubjectResponse } from '@/modules/subjects'
import { subjectRubricApi, type SubjectRubric, type SubjectRubricCreatePayload, type SubjectRubricUpdatePayload } from '../api'

/** Lỗi tiếng Việt đã kiểm soát, có thể đưa trực tiếp vào popup. */
export class RubricUiError extends Error {}

/** Dòng form dùng chuỗi để không nhầm ô điểm trống với số 0. */
export interface RubricCriterionForm {
  /** Khóa UI ổn định khi thêm/xóa/đổi vị trí, không gửi lên BE. */ key: string
  /** Nội dung tiêu chí. */ text: string
  /** Điểm nhập chưa chuyển kiểu. */ points: string
  /** Cờ bắt buộc theo hợp đồng hiện tại. */ mandatory: boolean
}

/** Dữ liệu form không cho đổi môn khi sửa rubric. */
export interface RubricForm {
  /** Tiêu đề rubric. */ title: string
  /** Hướng dẫn chung cho giảng viên/AI. */ description: string
  /** Thứ tự mảng là thứ tự tiêu chí sẽ được lưu. */ criteria: RubricCriterionForm[]
}

/** ID dùng an toàn trong JavaScript; không nhận số lẻ hoặc ID ngoài miền biểu diễn chính xác. */
export function rubricIdentifier(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))
    || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new RubricUiError(i18n.t('questions.rubricErrors.invalidId'))
  return Number(value)
}

/** Đổi chính xác về đơn vị 0,01 điểm, nhận dấu phẩy thập phân khi nhập tiếng Việt. */
function pointUnits(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new RubricUiError(i18n.t('questions.rubricErrors.decimals'))
  const [whole, fraction = ''] = normalized.split('.')
  const units = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(units) || units < 1 || units > 1000) throw new RubricUiError(i18n.t('questions.rubricErrors.range'))
  return units
}

/** Tổng điểm chỉ dùng hiển thị; form chưa nhập đủ trả null thay vì giả thành hợp lệ. */
export function rubricTotal(criteria: RubricCriterionForm[]): number | null {
  try { return criteria.reduce((total, criterion) => total + pointUnits(criterion.points), 0) / 100 }
  catch { return null }
}

/** Giữ dữ liệu nguồn khi mở form; chỉ renumber thứ tự khi người dùng chủ động lưu. */
export function rubricForm(subject: SubjectResponse, rubric: SubjectRubric | null): RubricForm {
  const criteria = rubric ? [...rubric.criteria].sort((a, b) => a.displayOrder - b.displayOrder || Number(a.id) - Number(b.id)) : []
  return { title: rubric?.title || `Rubric ${subject.code}`, description: rubric?.description ?? '',
    criteria: criteria.length ? criteria.map((criterion, index) => ({ key: `criterion-${index}`,
      text: criterion.criterionText, points: String(criterion.pointWeight), mandatory: criterion.isMandatory }))
      : [{ key: 'criterion-0', text: '', points: '', mandatory: false }] }
}

/** Kiểm tra nội dung và thang điểm, whitelist payload; BE vẫn là lớp bảo vệ cuối cùng. */
export function rubricUpdatePayload(form: RubricForm): SubjectRubricUpdatePayload {
  const title = form.title.trim()
  if (!title || title.length > 255 || title.includes('\0')) throw new RubricUiError(i18n.t('questions.rubricErrors.titleInvalid'))
  if (form.description.includes('\0')) throw new RubricUiError(i18n.t('questions.rubricErrors.descInvalid'))
  if (!form.criteria.length) throw new RubricUiError(i18n.t('questions.rubricErrors.noCriteria'))
  let total = 0
  const criteria = form.criteria.map((criterion, index) => {
    const text = criterion.text.trim()
    if (!text || text.includes('\0')) throw new RubricUiError(i18n.t('questions.rubricErrors.criterionText', { n: index + 1 }))
    if (typeof criterion.mandatory !== 'boolean') throw new RubricUiError(i18n.t('questions.rubricErrors.mandatoryFlag'))
    const units = pointUnits(criterion.points)
    total += units
    return { criterionText: text, pointWeight: units / 100, isMandatory: criterion.mandatory, displayOrder: index + 1 }
  })
  if (total !== 1000) throw new RubricUiError(i18n.t('questions.rubricErrors.totalMustBe10'))
  return { title, description: form.description.trim(), criteria }
}

/** Tạo mới mới được gửi subjectId; cập nhật không được đổi môn hoặc gửi ID tiêu chí cũ. */
export function rubricCreatePayload(form: RubricForm, subjectId: number | string): SubjectRubricCreatePayload {
  return { subjectId: rubricIdentifier(subjectId), ...rubricUpdatePayload(form) }
}

/** Chỉ báo sẵn sàng theo dữ liệu thực, không tự sửa thứ tự hoặc làm tròn tiêu chí lỗi khi đọc. */
export function isRubricReady(rubric: SubjectRubric): boolean {
  try {
    if (!rubric.criteria.length) return false
    const orders = new Set<number>()
    let total = 0
    for (const criterion of rubric.criteria) {
      if (!criterion.criterionText.trim() || criterion.criterionText.includes('\0') || typeof criterion.isMandatory !== 'boolean'
        || !Number.isSafeInteger(criterion.displayOrder) || criterion.displayOrder < 1 || orders.has(criterion.displayOrder)) return false
      orders.add(criterion.displayOrder)
      total += pointUnits(String(criterion.pointWeight))
    }
    return total === 1000
  } catch { return false }
}

/** Parse kết quả thực, không biến payload lỗi thành trạng thái môn chưa có rubric. */
export function parseSubjectRubric(data: unknown, subjectId: number): SubjectRubric {
  const fail = (): never => { throw new RubricUiError(i18n.t('questions.rubricErrors.responseInvalid')) }
  if (!data || typeof data !== 'object') return fail()
  const envelope = data as { code?: unknown; result?: unknown }
  if (envelope.code !== 1000 || !envelope.result || typeof envelope.result !== 'object') return fail()
  const source = envelope.result as Record<string, unknown>
  if (rubricIdentifier(source.subjectId) !== subjectId || !Array.isArray(source.criteria)
    || (source.title != null && typeof source.title !== 'string') || (source.description != null && typeof source.description !== 'string')) return fail()
  const ids = new Set<number>()
  const criteria = source.criteria.map(raw => {
    if (!raw || typeof raw !== 'object') return fail()
    const row = raw as Record<string, unknown>
    const id = rubricIdentifier(row.id)
    if (ids.has(id) || typeof row.criterionText !== 'string' || typeof row.pointWeight !== 'number' || !Number.isFinite(row.pointWeight)
      || typeof row.isMandatory !== 'boolean' || !Number.isSafeInteger(row.displayOrder)) return fail()
    ids.add(id)
    return { id, criterionText: row.criterionText, pointWeight: row.pointWeight, isMandatory: row.isMandatory, displayOrder: row.displayOrder as number }
  })
  return { id: rubricIdentifier(source.id), subjectId, title: (source.title as string | null | undefined) ?? '', description: (source.description as string | null | undefined) ?? '',
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined, criteria }
}

/** Chỉ lỗi 1600/404 nghĩa là chưa có rubric; lỗi quyền, mạng hoặc dữ liệu phải được báo rõ. */
export async function loadSubjectRubric(subjectId: number, signal?: AbortSignal): Promise<SubjectRubric | null> {
  try { return parseSubjectRubric((await subjectRubricApi.getBySubject(subjectId, signal)).data, subjectId) }
  catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404 && error.response.data?.code === 1600) return null
    throw error
  }
}

/** Đọc mọi trang của API phân công hiện hành, không gọi danh sách môn toàn hệ thống. */
export async function loadRubricSubjects(signal?: AbortSignal): Promise<SubjectResponse[]> {
  const subjects = new Map<number, SubjectResponse>()
  let page = 0, totalPages = 1
  while (page < totalPages) {
    const { data } = await subjectAssignmentApi.getMySubjectsPage(page, signal)
    const result = data.result
    if (data.code !== 1000 || !result || !Array.isArray(result.items) || result.page !== page
      || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 || result.totalPages > 1_000_001
      || !Number.isSafeInteger(result.totalElements) || result.totalElements < 0 || !Number.isSafeInteger(result.size)
      || result.size < 1 || result.size > 100 || result.items.length > result.size)
      throw new RubricUiError(i18n.t('questions.rubricErrors.assignmentInvalid'))
    totalPages = result.totalPages
    for (const subject of result.items) {
      if (!subject || typeof subject.code !== 'string' || typeof subject.name !== 'string') throw new RubricUiError(i18n.t('questions.rubricErrors.subjectInvalid'))
      const id = rubricIdentifier(subject.id)
      subjects.set(id, { ...subject, id })
    }
    page++
  }
  return [...subjects.values()]
}

/** Thông báo an toàn bằng tiếng Việt; không hiển thị SQL hoặc chuỗi kỹ thuật không kiểm soát. */
export function rubricError(error: unknown, fallback: string): string {
  if (error instanceof RubricUiError) return error.message
  if (axios.isAxiosError(error)) {
    if (!error.response) return i18n.t('questions.rubricErrors.noResponse')
    const code = error.response.data?.code
    if (typeof code === 'number' && [1002, 1003, 1004, 1016, 1101, 1600, 1601, 1602, 1603, 1604].includes(code)) return i18n.t(`questions.rubricErrors.${code}`)
    if (error.response.status === 401) return i18n.t('questions.rubricErrors.http401')
    if (error.response.status === 403) return i18n.t('questions.rubricErrors.http403')
    if (error.response.status === 409) return i18n.t('questions.rubricErrors.http409')
    if (error.response.status >= 500) return i18n.t('questions.rubricErrors.http5xx')
  }
  return fallback
}
