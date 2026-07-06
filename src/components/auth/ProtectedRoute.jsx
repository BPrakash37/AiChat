import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, isAdmin } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f14]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.status !== 'active') return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/chat" replace />

  return children
}
