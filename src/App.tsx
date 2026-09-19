import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <h1 className="text-4xl font-bold text-blue-600 p-8 text-center">
            AIVES Frontend
          </h1>
          <p className="text-gray-600 text-center">
            Khởi tạo thành công Vite + React + TailwindCSS
          </p>
        </div>
      </Router>
    </QueryClientProvider>
  )
}
