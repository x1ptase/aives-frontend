// ===== User & Auth =====
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'instructor' | 'student'
  avatar?: string
}

// ===== Student =====
export interface Student {
  id: string
  studentCode: string
  name: string
  email: string
  class: string
}

// ===== Question =====
export interface Question {
  id: string
  content: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  rubric: Rubric
  createdAt: string
}

// ===== Rubric =====
export interface RubricCriteria {
  name: string
  description: string
  maxScore: number
}

export interface Rubric {
  id: string
  criteria: RubricCriteria[]
  totalScore: number
}

// ===== Exam =====
export interface Exam {
  id: string
  title: string
  description: string
  questions: Question[]
  students: Student[]
  startTime: string
  endTime: string
  status: 'draft' | 'active' | 'completed'
}

// ===== Grading =====
export interface GradingResult {
  id: string
  examId: string
  studentId: string
  scores: {
    criteriaName: string
    score: number
    feedback: string
  }[]
  totalScore: number
  aiSuggestion: string
  finalComment: string
}
