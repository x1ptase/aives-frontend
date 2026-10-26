# 🎓 AI-powered Viva Exam System (AIVES) - Frontend

An intelligent oral examination system that assists instructors in automating question generation, conducting virtual viva exams, and providing AI-assisted grading based on predefined rubrics. The frontend is optimized to deliver a seamless user experience for administrators, instructors, and students.

## 🚀 Tech Stack

- **Core Framework:** React 19 (Vite)
- **Language:** TypeScript
- **State Management:** Zustand (global state), React hooks (local/server state)
- **UI/Styling:** Tailwind CSS
- **Real-time Communication:** WebSockets & MediaRecorder API
- **Backend Architecture:** Tight integration with a Java-based Backend (Spring Boot) to handle audio streaming and AI processing.

## 📂 Folder Structure (Modular Monolith)

The frontend is a single deployable SPA organised into **business modules** (feature-first),
a **shared kernel** and an **app shell**.

```text
src/
├── main.tsx, App.tsx     # Entry point and providers
├── app/                  # App shell: routing, per-role shells, layouts
│   ├── routes/           #   AppRoutes
│   ├── shells/           #   AdminApp, LecturerApp, StudentApp
│   └── layout/           #   DashboardLayout, Sidebar, TopHeader, UserMenu
├── modules/              # Business modules: each owns its API, UI, state and pages
│   ├── auth/             #   sign in/up, session store (useAuthStore)
│   ├── users/            #   user management, profile
│   ├── subjects/         #   subjects, lecturer-subject assignments, My Subjects card
│   ├── questions/        #   question bank, AI generation, approval, rubrics
│   ├── materials/        #   learning materials upload/management
│   ├── exams/            #   exams, grading, WebSocket/audio (realtime), exam store
│   ├── ai-config/        #   AI provider configuration
│   └── dashboard/        #   role dashboards (compose other modules)
│   (each module: api.ts, components/, pages/, store/, hooks/, index.ts = public API)
├── shared/               # Shared kernel: no dependency on modules/ or app/
│   ├── api/              #   axios instance, common API types (PageResult)
│   ├── components/common #   Generic UI (EmptyState, Icons, SectionCard...)
│   └── config/, types/
└── assets/               # Static images
```

### Module rules (enforced by `.oxlintrc.json`)
1. A module exposes its public API only through `modules/<name>/index.ts`.
2. Other modules import it as `@/modules/<name>`, never `@/modules/<name>/internal/path`.
3. `shared/` must not import from `modules/` or `app/`; `modules/` must not import from `app/`.
4. Dependencies between modules stay acyclic:
   `auth` ← `users` ← `subjects` ← `materials` ← `questions`; `exams` and `dashboard` sit on top.