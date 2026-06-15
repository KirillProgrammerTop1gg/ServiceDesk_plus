import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import {
  ContentWrapper, SectionTitle, Card, CardTitle, CardMeta, CardBody,
  RowActions, Button, Spinner, Alert, StatusBadge
} from '../components/ui'
import { getAdminProblems, getNewProblems } from '../api/client'

// Statuses list
const STATUS_FILTERS = [
  'Всі',
  'На розгляді',
  'Прийнято',
  'Приймання ціни',
  'У роботі',
  'Прийняття оплати',
  'Готово до видачі',
  'Завершено',
  'Відхилено'
]

export default function AdminPage() {
  const { user } = useAuth()
  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [activeFilter, setActiveFilter] = useState('Всі')

  const fetchProblems = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch staff-assigned or system-wide problems
      const { data: adminRes } = await getAdminProblems()
      let combined = [...adminRes]

      // 2. If Master, we also fetch accepted unassigned problems that they can take
      if (user && user.role === 'master') {
        try {
          const { data: unassignedRes } = await getNewProblems()
          const existingIds = new Set(combined.map(p => p.id))
          unassignedRes.forEach(p => {
            if (!existingIds.has(p.id)) {
              combined.push({
                ...p,
                assignee_name: null // Free unassigned ticket
              })
            }
          })
        } catch (unassignedErr) {
          console.warn('Could not fetch unassigned problems', unassignedErr)
        }
      }

      // Sort newest first
      combined.sort((a, b) => b.id - a.id)
      setProblems(combined)
    } catch (err) {
      setError('Не вдалося завантажити запити')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProblems()
  }, [user])

  // Filter based on active tab/pill
  const filteredProblems = activeFilter === 'Всі'
    ? problems
    : problems.filter(p => p.status === activeFilter)

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <HeaderRow>
          <SectionTitle style={{ marginBottom: 0 }}>
            {user?.role === 'master' ? 'Заявки на обслуговування' : 'Панель керування запитами'}
          </SectionTitle>
          <HeaderActions>
            {user && ['admin', 'manager'].includes(user.role) && (
              <Button as={Link} to="/admin/stats" $variant="cyan">
                <span>Статистика</span>
              </Button>
            )}
            {user && user.role === 'admin' && (
              <Button as={Link} to="/admin/users" $variant="cyan" style={{ marginLeft: '0.75rem' }}>
                <span>Керування ролями</span>
              </Button>
            )}
          </HeaderActions>
        </HeaderRow>

        {/* Dynamic filters tabs */}
        <FilterTabsContainer>
          {STATUS_FILTERS.map((status) => {
            // Hide "На розгляді" for master since they never see or process pending reviews
            if (user?.role === 'master' && status === 'На розгляді') return null

            const count = status === 'Всі' 
              ? problems.length 
              : problems.filter(p => p.status === status).length

            return (
              <TabBtn
                key={status}
                $active={activeFilter === status}
                onClick={() => setActiveFilter(status)}
              >
                <span>{status}</span>
                <TabBadge $active={activeFilter === status}>{count}</TabBadge>
              </TabBtn>
            )
          })}
        </FilterTabsContainer>

        {loading && <Spinner />}
        {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}

        {!loading && filteredProblems.length === 0 && (
          <Alert $type="info">
            <span>ℹ</span>
            <span>Немає запитів із статусом "{activeFilter}".</span>
          </Alert>
        )}

        {!loading && filteredProblems.map((p) => {
          const isUnassignedMasterTicket = user?.role === 'master' && p.status === 'Прийнято' && !p.assignee_name;

          return (
            <Card key={p.id} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <CardTitle style={{ margin: 0 }}>#{p.id} - {p.title}</CardTitle>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {isUnassignedMasterTicket && (
                    <FreeTicketBadge>Вільна</FreeTicketBadge>
                  )}
                  <StatusBadge $status={p.status}>{p.status}</StatusBadge>
                </div>
              </div>

              <CardMeta style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                Створено: {new Date(p.date_created).toLocaleDateString('uk-UA', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
                {p.assignee_name && (
                  <span style={{ color: '#00e5ff', marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'var(--theme-font-mono)' }}>
                    [Виконавець: {p.assignee_name}]
                  </span>
                )}
                {p.price_status === 'accepted' && p.proposed_price && (
                  <span style={{ color: '#00ff9d', marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'var(--theme-font-mono)', border: '1px solid #00ff9d', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                    💸 Узгоджена ціна: {p.proposed_price} грн
                  </span>
                )}
              </CardMeta>

              <CardBody style={{ marginBottom: '1.25rem' }}>{p.description}</CardBody>

              <RowActions>
                <Button as={Link} to={`/requests/${p.id}`} $variant={isUnassignedMasterTicket ? 'green' : 'cyan'}>
                  <span>{isUnassignedMasterTicket ? 'Взяти в роботу / Переглянути' : 'Керувати заявкою'}</span>
                </Button>
                {p.status === 'Завершено' && (
                  <Button as={Link} to={`/service-record/${p.id}`} $variant="green">
                    <span>Талон обслуговування</span>
                  </Button>
                )}
              </RowActions>
            </Card>
          )
        })}
      </ContentWrapper>
      <Footer />
    </>
  )
}

// ── Styled Components ─────────────────────────────────────
const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
`

const FilterTabsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const TabBtn = styled.button`
  font-family: var(--theme-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: ${({ $active, theme }) => $active ? theme.colors.cyanGlow : 'transparent'};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.cyan : theme.colors.border};
  color: ${({ $active, theme }) => $active ? theme.colors.cyan : theme.colors.textSecondary};
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
    border-color: ${({ theme }) => theme.colors.cyan};
    background: ${({ theme }) => theme.colors.cyanGlow};
  }
`

const TabBadge = styled.span`
  display: inline-block;
  font-size: 0.62rem;
  background: ${({ $active, theme }) => $active ? theme.colors.cyan : theme.colors.border};
  color: ${({ $active, theme }) => $active ? theme.colors.bgDeep : theme.colors.textPrimary};
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: bold;
`

const FreeTicketBadge = styled.span`
  font-family: var(--theme-font-mono);
  font-size: 0.55rem;
  text-transform: uppercase;
  color: #ffb300;
  border: 1px solid #ffb300;
  padding: 0.15rem 0.4rem;
  display: inline-block;
  letter-spacing: 0.1em;
  box-shadow: 0 0 8px rgba(255, 179, 0, 0.2);
`



