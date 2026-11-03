import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import { formatNumber } from '@/shared/i18n/format'
import type { SubjectResponse } from '@/modules/subjects'
import PageContainer from '@/shared/components/common/PageContainer'
import LoadingState from '@/shared/components/common/LoadingState'
import FeedbackProvider from '@/shared/components/common/FeedbackProvider'
import { useFeedback } from '@/shared/components/common/feedback'
import { subjectRubricApi, type SubjectRubric } from '../api'
import RubricFormModal from '../components/RubricFormModal'
import { isRubricReady, loadRubricSubjects, loadSubjectRubric, rubricError, rubricIdentifier, RubricUiError } from '../components/rubricHelpers'

/** Chỉ thao tác rubric của môn được phân công; BE vẫn xác minh quyền trên mỗi request. */
function LecturerRubricsContent() {
  const { t } = useTranslation()
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [rubric, setRubric] = useState<SubjectRubric | null>(null)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [rubricLoading, setRubricLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState(false)
  const [rubricLoadError, setRubricLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<{ subject: SubjectResponse; rubric: SubjectRubric | null } | null>(null)
  const writing = useRef(false)
  const feedback = useFeedback()
  const subject = subjects.find(item => String(item.id) === selectedId)

  useEffect(() => {
    const controller = new AbortController()
    setSubjectsLoading(true); setSubjectsError(false)
    loadRubricSubjects(controller.signal).then(items => {
      if (controller.signal.aborted) return
      setSubjects(items)
      setSelectedId(current => items.some(item => String(item.id) === current) ? current : String(items[0]?.id ?? ''))
    }).catch(error => {
      if (controller.signal.aborted) return
      setSubjects([]); setSelectedId(''); setEditor(null); setSubjectsError(true)
      feedback.notify({ title: i18n.t('questions.rubric.subjectsFailedTitle'), message: rubricError(error, i18n.t('questions.rubric.subjectsFailed')), tone: 'error' })
    }).finally(() => { if (!controller.signal.aborted) setSubjectsLoading(false) })
    return () => controller.abort()
  }, [reload, feedback])

  useEffect(() => {
    if (!selectedId || subjectsLoading || subjectsError) {
      setRubric(null); setRubricLoading(false); setRubricLoadError(false)
      return
    }
    const controller = new AbortController()
    setRubricLoading(true); setRubricLoadError(false); setRubric(null)
    loadSubjectRubric(rubricIdentifier(selectedId), controller.signal).then(result => {
      if (!controller.signal.aborted) setRubric(result)
    }).catch(error => {
      if (controller.signal.aborted) return
      setRubricLoadError(true)
      feedback.notify({ title: i18n.t('questions.rubric.loadFailedTitle'), message: rubricError(error, i18n.t('questions.rubric.loadFailed')), tone: 'error' })
    }).finally(() => { if (!controller.signal.aborted) setRubricLoading(false) })
    return () => controller.abort()
  }, [selectedId, subjectsLoading, subjectsError, reload, feedback])

  /** Luôn đọc bản mới trước khi mở form, tránh dùng rubric cũ sau thao tác của thành viên khác. */
  const openForm = async (mode: 'create' | 'edit') => {
    if (!subject || writing.current || busy || subjectsLoading || rubricLoading || subjectsError || rubricLoadError) return
    writing.current = true; setBusy(true)
    try {
      const latest = await loadSubjectRubric(rubricIdentifier(subject.id))
      if (mode === 'create' && latest) throw new RubricUiError(t('questions.rubric.alreadyExists'))
      if (mode === 'edit' && !latest) throw new RubricUiError(t('questions.rubric.gone'))
      setRubric(latest); setEditor({ subject, rubric: latest })
    } catch (error) {
      feedback.notify({ title: t('questions.rubric.openFailedTitle'), message: rubricError(error, t('questions.rubric.openFailed')), tone: 'error' })
      setReload(value => value + 1)
    } finally { writing.current = false; setBusy(false) }
  }

  /** Xác nhận đúng ID rubric, cảnh báo ảnh hưởng phiên chưa chốt; không tự retry DELETE khi mất phản hồi. */
  const remove = async () => {
    if (!subject || !rubric || writing.current || busy) return
    writing.current = true; setBusy(true)
    try {
      const latest = await loadSubjectRubric(rubricIdentifier(subject.id))
      if (!latest || String(latest.id) !== String(rubric.id)) throw new RubricUiError(t('questions.rubric.changed'))
      if (!await feedback.confirm({ title: t('questions.rubric.deleteTitle'), tone: 'error', confirmLabel: t('questions.rubric.deleteLabel'),
        message: t('questions.rubric.deleteMessage', { code: subject.code, name: subject.name }) })) return
      const { data } = await subjectRubricApi.delete(rubricIdentifier(latest.id))
      if (data?.code !== 1000) throw new RubricUiError(t('questions.rubric.deleteInvalid'))
      setRubric(null)
      feedback.notify({ title: t('questions.rubric.deletedTitle'), message: t('questions.rubric.deletedMessage', { code: subject.code }), tone: 'success' })
    } catch (error) { feedback.notify({ title: t('questions.rubric.deleteFailTitle'), message: rubricError(error, t('questions.rubric.deleteFail')), tone: 'error' }) }
    finally { writing.current = false; setBusy(false); setReload(value => value + 1) }
  }

  const locked = busy || subjectsLoading || rubricLoading || subjectsError || rubricLoadError
  const ready = rubric ? isRubricReady(rubric) : false
  return <PageContainer title={t('questions.rubric.pageTitle')} subtitle={t('questions.rubric.pageSubtitle')}>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6" aria-label={t('questions.rubric.pickSubjectAria')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block min-w-0 flex-1 text-sm font-semibold sm:max-w-xl">{t('questions.rubric.assignedSubject')}
          <select aria-label={t('questions.rubric.assignedSubject')} disabled={busy || subjectsLoading || subjectsError || subjects.length === 0} value={selectedId}
            onChange={event => { setSelectedId(event.target.value); setRubric(null); setRubricLoading(true); setEditor(null) }}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100">
            {!subjects.length && <option value="">{t('questions.rubric.noSubjectOption')}</option>}
            {subjects.map(item => <option key={item.id} value={String(item.id)}>{item.code} — {item.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || subjectsLoading || rubricLoading} onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">{t('questions.rubric.reload')}</button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{t('questions.rubric.hint')}</p>
    </section>
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label={t('questions.rubric.selectedAria')}>
      {subjectsLoading || rubricLoading ? <div className="p-6"><LoadingState /></div>
        : subjectsError || rubricLoadError ? <div className="p-8 text-center"><button type="button" disabled={busy} onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2 text-sm">{t('questions.rubric.retry')}</button></div>
        : !subject ? <div className="p-8 text-center text-sm text-slate-600">{t('questions.rubric.noAssignment')}</div>
        : !rubric ? <div className="space-y-4 p-8 text-center">
          <h2 className="font-semibold text-slate-800">{t('questions.rubric.noRubric', { code: subject.code })}</h2>
          <p className="text-sm text-slate-500">{t('questions.rubric.createFirst')}</p>
          <button type="button" disabled={locked} onClick={() => openForm('create')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{t('questions.rubric.create')}</button>
        </div> : <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold text-slate-800">{rubric.title || t('questions.rubric.defaultTitle', { code: subject.code })}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('questions.rubric.meta', { code: subject.code, count: rubric.criteria.length })}</p>
              <span className={`mt-3 inline-block rounded border px-2 py-1 text-xs font-semibold ${ready ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>{ready ? t('questions.rubric.ready') : t('questions.rubric.notReady')}</span>
            </div>
            <div className="flex gap-2"><button type="button" disabled={locked} onClick={() => openForm('edit')} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">{t('questions.rubric.edit')}</button>
              <button type="button" disabled={locked} onClick={remove} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">{t('questions.rubric.delete')}</button></div>
          </div>
          {rubric.description && <p className="whitespace-pre-wrap break-words px-6 pt-5 text-sm leading-relaxed text-slate-600">{rubric.description}</p>}
          <div className="overflow-x-auto p-6"><table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-slate-500"><tr><th className="px-3 py-3">{t('questions.rubric.colOrder')}</th><th className="min-w-64 px-3 py-3">{t('questions.rubric.colCriterion')}</th><th className="px-3 py-3">{t('questions.rubric.colPoints')}</th><th className="px-3 py-3">{t('questions.rubric.colMandatory')}</th></tr></thead>
            <tbody>{[...rubric.criteria].sort((a, b) => a.displayOrder - b.displayOrder || Number(a.id) - Number(b.id)).map(criterion => <tr key={criterion.id} className="border-b border-slate-100">
              <td className="px-3 py-4">{criterion.displayOrder}</td><td className="whitespace-pre-wrap break-words px-3 py-4">{criterion.criterionText || t('questions.rubric.noText')}</td>
              <td className="px-3 py-4 tabular-nums">{formatNumber(criterion.pointWeight, { maximumFractionDigits: 2 })}</td><td className="px-3 py-4">{criterion.isMandatory ? t('questions.rubric.yes') : t('questions.rubric.no')}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="px-6 pb-6 text-xs leading-relaxed text-slate-500">{t('questions.rubric.footer')}</p>
        </>}
    </section>
    {editor && subjects.some(item => String(item.id) === String(editor.subject.id)) && <RubricFormModal subject={editor.subject} rubric={editor.rubric}
      onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setReload(value => value + 1) }} onWritingChange={setBusy} />}
  </PageContainer>
}

/** Giữ popup ở cấp trang để kết quả vẫn hiển thị sau khi form con đóng. */
export default function LecturerRubrics() {
  return <FeedbackProvider><LecturerRubricsContent /></FeedbackProvider>
}
