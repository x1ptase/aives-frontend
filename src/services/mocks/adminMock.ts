import MockAdapter from 'axios-mock-adapter'

export const setupAdminMock = (mock: MockAdapter) => {
  // GET /admin/stats
  mock.onGet('/admin/stats').reply(() => {
    return [
      200,
      {
        totalUsers: '10',
        usersDetail: '3 Lecturers · 6 Students',
        activeExams: '3',
        activeExamsDetail: 'Currently in progress',
        completedExams: '30',
        completedExamsDetail: 'This semester',
        aiInterviews: '80',
        aiInterviewsDetail: 'This semester',
      },
    ]
  })

  // GET /admin/recent-activity
  mock.onGet('/admin/recent-activity').reply(() => {
    return [
      200,
      [
        { id: 1, timestamp: '10:42 AM', user: 'Nguyễn Văn An', role: 'Lecturer', action: 'Created Exam', detail: 'Final Term CSI106 - Spring 2026', status: 'success' },
        { id: 2, timestamp: '09:15 AM', user: 'Trần Minh Tuấn', role: 'Admin', action: 'Updated AI Configuration', detail: 'Changed STT Engine to Whisper', status: 'warning' },
        { id: 3, timestamp: 'Yesterday', user: 'Phạm Minh Khoa', role: 'Student', action: 'Completed Exam', detail: 'Midterm - Score: 8.5/10', status: 'success' },
        { id: 4, timestamp: 'Yesterday', user: 'Nguyễn Văn An', role: 'Lecturer', action: 'Created Question', detail: 'Added question to CSI106 question bank', status: 'success' },
      ],
    ]
  })

  // GET /admin/ai-config
  mock.onGet('/admin/ai-config').reply(() => {
    return [
      200,
      [
        { label: 'Speech-to-Text', detail: 'Whisper', status: 'Active' },
        { label: 'Text-to-Speech', detail: 'TTS Engine', status: 'Active' },
        { label: 'AI Evaluator', detail: 'LLM', status: 'Active' },
        { label: 'RAG / Embedding', detail: 'Embedding Service', status: 'Active' },
      ],
    ]
  })
}
