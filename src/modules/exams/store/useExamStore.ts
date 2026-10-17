import { create } from 'zustand'

interface Question {
  id: string
  content: string
  rubric: string
}

interface ExamState {
  currentQuestionIndex: number
  questions: Question[]
  isRecording: boolean
  examId: string | null
  setExamId: (id: string) => void
  setQuestions: (questions: Question[]) => void
  nextQuestion: () => void
  previousQuestion: () => void
  setRecording: (isRecording: boolean) => void
  reset: () => void
}

export const useExamStore = create<ExamState>()((set) => ({
  currentQuestionIndex: 0,
  questions: [],
  isRecording: false,
  examId: null,

  setExamId: (id) => set({ examId: id }),

  setQuestions: (questions) => set({ questions, currentQuestionIndex: 0 }),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(
        state.currentQuestionIndex + 1,
        state.questions.length - 1,
      ),
    })),

  previousQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),

  setRecording: (isRecording) => set({ isRecording }),

  reset: () =>
    set({
      currentQuestionIndex: 0,
      questions: [],
      isRecording: false,
      examId: null,
    }),
}))
