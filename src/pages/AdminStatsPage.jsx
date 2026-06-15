import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  ContentWrapper,
  SectionTitle,
  Panel,
  Button,
  Spinner,
  Alert,
  Mono,
} from '../components/ui'
import { getAdminStats } from '../api/client'

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Не вдалося завантажити статистику'))
      .finally(() => setLoading(false))
  }, [])

  const formatDuration = (seconds) => {
    if (seconds == null) return '-'
    const days = Math.floor(seconds / (24 * 3600))
    const hrs = Math.floor((seconds % (24 * 3600)) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const parts = []
    if (days) parts.push(`${days} дн`)
    if (hrs) parts.push(`${hrs} год`)
    if (mins) parts.push(`${mins} хв`)
    if (secs) parts.push(`${secs} с`)
    return parts.join(' ')
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Статистика</SectionTitle>
        {loading && <Spinner />}
        {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}
        {stats && (
          <Panel $wide>
            <Mono $size="0.9rem" style={{ display: 'block', marginBottom: '0.75rem' }}>
              Активних запитів: {stats.active_count}
            </Mono>
            <Mono $size="0.9rem" style={{ display: 'block', marginBottom: '0.75rem' }}>
              Запити за статусами:
            </Mono>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {Object.entries(stats.status_counts).map(([status, count]) => (
                <li key={status}>{status}: {count}</li>
              ))}
            </ul>
            <Mono $size="0.9rem" style={{ display: 'block', marginTop: '1rem' }}>
              Середній час обробки (завершені): {formatDuration(stats.average_processing_seconds)}
            </Mono>
          </Panel>
        )}
        <Button as={Link} to="/admin" style={{ marginTop: '1.5rem' }}>
          <span>← Повернутись</span>
        </Button>
      </ContentWrapper>
      <Footer />
    </>
  )
}
