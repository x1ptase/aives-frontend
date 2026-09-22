# 🎓 AI-powered Viva Exam System (AIVES) - Frontend

An intelligent oral examination system that assists instructors in automating question generation, conducting virtual viva exams, and providing AI-assisted grading based on predefined rubrics. The frontend is optimized to deliver a seamless user experience for administrators, instructors, and students.

## 🚀 Tech Stack

- **Core Framework:** React 18 (Vite)
- **Language:** TypeScript
- **State Management:** Zustand (Global State), TanStack Query (Server State)
- **UI/Styling:** Tailwind CSS + shadcn/ui
- **Real-time Communication:** WebSockets & MediaRecorder API
- **Backend Architecture:** Tight integration with a Java-based Backend (Spring Boot) to handle audio streaming and AI processing.

## 📂 Folder Structure

```text
src/
├── assets/         # Static images, icons, and audio files
├── components/     # Shared UI components (Button, Modal, Table...)
├── config/         # Project configurations (axios instance, constants...)
├── hooks/          # Custom hooks (useAudioRecorder, useWebSocket...)
├── layouts/        # Main layouts (AdminLayout, ExamLayout)
├── pages/          # Page components (Dashboard, QuestionBank, ExamRoom, Review)
├── services/       # API call functions (api.ts, websocket.ts)
├── store/          # Zustand stores (useAuthStore, useExamStore)
├── types/          # TypeScript interfaces/types (Student, Rubric...)
├── utils/          # Utility functions (formatDate, calculateScore...)
├── App.tsx         # Root component
└── main.tsx        # Entry point