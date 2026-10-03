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
        { id: 2, timestamp: '09:15 AM', user: 'Administrator', role: 'Admin', action: 'Uploaded Learning Material', detail: 'Uploaded "Chapter 3 - Database.pdf', status: 'success' },
        { id: 3, timestamp: 'Yesterday', user: 'Phạm Minh Khoa', role: 'Student', action: 'Completed Exam', detail: 'Midterm - Score: 8.5/10', status: 'success' },
        { id: 4, timestamp: 'Yesterday', user: 'Nguyễn Văn An', role: 'Lecturer', action: 'Created Question', detail: 'Added question to CSI106 question bank', status: 'success' },
      ],
    ]
  })


}
