import React from 'react'
import { useAuth } from '../context/AuthContext'
import CheckMessagePage from './CheckMessagePage'
import AdminProblemPage from './AdminProblemPage'
import { Spinner, ContentWrapper } from '../components/ui'

export default function UnifiedRequestDetailPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <ContentWrapper style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spinner />
      </ContentWrapper>
    )
  }

  // If client, render client message page; if staff (manager, admin, master), render administrative problem management page
  if (user?.role === 'client') {
    return <CheckMessagePage />
  }

  return <AdminProblemPage />
}
