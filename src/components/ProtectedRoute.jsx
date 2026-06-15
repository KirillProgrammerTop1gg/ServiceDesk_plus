import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'
import { PageWrapper } from './ui'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return <PageWrapper><Spinner /></PageWrapper>

  if (!user) return <Navigate to="/login" replace />

  if (role) {
    const isAllowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
    if (!isAllowed) return <Navigate to="/" replace />;
  }

  return children
}
