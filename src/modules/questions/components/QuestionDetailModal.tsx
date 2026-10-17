import { useState } from 'react'
import { QuestionItem, questionApi } from '../api'
import QuestionStatusBadge from './QuestionStatusBadge'

interface QuestionDetailModalProps {
  question: QuestionItem
  onClose: () => void
  onApprove?: (question: QuestionItem) => Promise<void> | void
}

export default function QuestionDetailModal({ question, onClose, onApprove }: QuestionDetailModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem>(question)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [approveSuccess, setApproveSuccess] = useState(false)

  const rubric = currentQuestion.rubric

  const handleApprove = async () => {
    setApproving(true)
    setApproveError('')
    try {
      const res = await questionApi.approve(currentQuestion.id)
      const updated: QuestionItem = res.data?.result || { ...currentQuestion, status: 'APPROVED' }
      setCurrentQuestion(updated)
      setApproveSuccess(true)
      if (onApprove) {
        await onApprove(updated)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to approve question.'
      setApproveError(msg)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
              Question #{currentQuestion.id}
            </span>
            <QuestionStatusBadge status={currentQuestion.status} />
            {currentQuestion.sourceType && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1">
                {currentQuestion.sourceType === 'AI' && '✨ '}{currentQuestion.sourceType}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {currentQuestion.bloomLevel && (
              <div className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                Bloom: <strong>{currentQuestion.bloomLevel}</strong>
              </div>
            )}
            {currentQuestion.answerTimeLimitSeconds && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                ⏱️ Time limit: <strong>{currentQuestion.answerTimeLimitSeconds}s</strong>
              </div>
            )}
            {currentQuestion.createdByName && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Created by: <strong>{currentQuestion.createdByName}</strong>
              </div>
            )}
            {currentQuestion.subjectName && (
              <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                Subject: <strong>{currentQuestion.subjectName}</strong>
              </div>
            )}
          </div>

          {/* Topics */}
          {currentQuestion.topics && currentQuestion.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Topics:</span>
              {currentQuestion.topics.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Question Content */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Oral Exam Question
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium leading-relaxed">
              {currentQuestion.content}
            </div>
          </div>

          {/* Reference Answer */}
          {currentQuestion.referenceAnswer && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>Reference Answer & Key Outline</span>
              </h3>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                {currentQuestion.referenceAnswer}
              </div>
            </div>
          )}

          {/* Rubric Evaluation */}
          {!rubric && (
            <p className="pt-2 border-t border-slate-100 text-xs text-slate-400 italic">
              No rubric available for this question.
            </p>
          )}
          {rubric && (() => {
            const criteria = rubric.criteria ?? []
            const rows = criteria.every(c => c.displayOrder != null)
              ? [...criteria].sort((x, y) => x.displayOrder - y.displayOrder)
              : criteria
            const hasWeight = (w: unknown) => w !== null && w !== undefined && !Number.isNaN(Number(w))
            const total = Number(
              rows.reduce((sum, c) => sum + (hasWeight(c.pointWeight) ? Number(c.pointWeight) : 0), 0).toFixed(6)
            )
            const missingWeight = rows.some(c => !hasWeight(c.pointWeight))
            return (
              <div className="pt-2 border-t border-slate-100">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rubric Evaluation
                  </h3>
                  {rubric.title && <p className="text-xs text-slate-500 mt-0.5">{rubric.title}</p>}
                  {rubric.description && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{rubric.description}</p>
                  )}
                </div>

                {rows.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Assessment Criterion</th>
                          <th className="py-2.5 px-3 w-28 text-center">Weight</th>
                          <th className="py-2.5 px-3 w-24 text-center">Mandatory</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {rows.map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                              {c.displayOrder ?? i + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {c.criterionText}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {hasWeight(c.pointWeight) ? (
                                <span className="px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-50 border border-blue-100">
                                  {c.pointWeight} pts
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {c.isMandatory === true ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50">
                                  Required
                                </span>
                              ) : c.isMandatory === false ? (
                                <span className="text-slate-500 text-[11px]">Optional</span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="py-2.5 px-3 text-right">
                            Total{missingWeight ? ' (some weights not provided)' : ''}:
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                            {total} pts
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No detailed criteria provided.</p>
                )}
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {approveError && <span className="text-xs text-red-600 font-medium">{approveError}</span>}
            {approveSuccess && <span className="text-xs text-emerald-600 font-medium">✓ Question approved successfully!</span>}
          </div>
          <div className="flex items-center gap-2">
            {currentQuestion.status !== 'APPROVED' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {approving ? 'Approving...' : '✓ Approve Question'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
