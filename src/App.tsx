import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Login, Dashboard } from './pages'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-dashboard" element={<Dashboard />} />
          <Route path="/lecturer-dashboard" element={<Dashboard />} />
          <Route path="/student-dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}
