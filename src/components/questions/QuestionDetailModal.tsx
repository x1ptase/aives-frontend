import { QuestionItem } from '@/services/api'

interface QuestionDetailModalProps {
  question: QuestionItem
  onClose: () => void
}

export default function QuestionDetailModal({ question, onClose }: QuestionDetailModalProps) {
  const rubric = question.rubric

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
              Question #{question.id}
            </span>
            {question.status && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                question.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {question.status}
              </span>
            )}
            {question.sourceType && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1">
                ✨ {question.sourceType}
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
            {question.bloomLevel && (
              <div className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                Bloom: <strong>{question.bloomLevel}</strong>
              </div>
            )}
            {question.answerTimeLimitSeconds && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                ⏱️ Time limit: <strong>{question.answerTimeLimitSeconds}s</strong>
              </div>
            )}
            {question.createdByName && (
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Created by: <strong>{question.createdByName}</strong>
              </div>
            )}
            {question.subjectName && (
              <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                Subject: <strong>{question.subjectName}</strong>
              </div>
            )}
          </div>

          {/* Topics */}
          {question.topics && question.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Topics:</span>
              {question.topics.map((t, idx) => (
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
              {question.content}
            </div>
          </div>

          {/* Reference Answer */}
          {question.referenceAnswer && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>Reference Answer & Key Outline</span>
              </h3>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                {question.referenceAnswer}
              </div>
            </div>
          )}

          {/* Rubric Evaluation */}
          {rubric && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📊 Rubric Evaluation (10-Point Scale)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{rubric.title}</p>
                </div>
                {rubric.description && (
                  <span className="text-[11px] text-slate-400 italic">
                    {rubric.description}
                  </span>
                )}
              </div>

              {rubric.criteria && rubric.criteria.length > 0 ? (
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
                      {rubric.criteria.map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {c.displayOrder || i + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {c.criterionText}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-50 border border-blue-100">
                              {Number(c.pointWeight).toFixed(1)} pts
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.isMandatory ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50">
                                Required
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-right">
                          Total Score:
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                          {rubric.criteria.reduce((sum, c) => sum + Number(c.pointWeight || 0), 0).toFixed(1)} / 10.0 pts
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
