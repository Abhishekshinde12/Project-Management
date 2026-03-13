import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '@/store/authStore'

export default function AppLayout() {
  const { isLoggedIn } = useAuthStore()

  // isLoggedIn is persisted in localStorage via Zustand persist.
  // It's synchronously available on first render — no hydration delay needed.
  // The browser's httpOnly cookie is what actually authenticates API requests;
  // isLoggedIn is just our local signal to show the app vs redirect to /login.
  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-ink-950">
        <Outlet />
      </main>
    </div>
  )
}