import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from '@/app/routes/AppRoutes'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  )
}
