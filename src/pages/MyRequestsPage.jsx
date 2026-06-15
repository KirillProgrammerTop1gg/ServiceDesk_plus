import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import {
  ContentWrapper, SectionTitle, Card, CardTitle, CardMeta, CardBody,
  StatusBadge, RowActions, Button, Spinner, Alert,
} from '../components/ui'
import { getMyProblems } from '../api/client'
import AdminPage from './AdminPage'

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

export default function MyRequestsPage() {
  const { user } = useAuth()
  
  // Dynamic role-based routing switch: if the user is staff, render the staff page
  if (user && user.role !== 'client') {
    return <AdminPage />
  }

  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [activeFilter, setActiveFilter] = useState('Всі')

  useEffect(() => {
    getMyProblems()
      .then(({ data }) => {
        // Sort newest first
        const sorted = [...data].sort((a, b) => b.id - a.id)
        setProblems(sorted)
      })
      .catch(() => setError('Не вдалося завантажити заявки'))
      .finally(() => setLoading(false))
  }, [])

  // Filter based on active tab/pill
  const filteredProblems = activeFilter === 'Всі'
    ? problems
    : problems.filter(p => p.status === activeFilter)

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Мої заявки</SectionTitle>

        <TopRow>
          <Button as={Link} to="/requests/new" $variant="green">
            <span>+ Нова заявка</span>
          </Button>
        </TopRow>

        {/* Dynamic filters tabs */}
        <FilterTabsContainer>
          {STATUS_FILTERS.map((status) => {
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
            <span>Немає заявок із статусом "{activeFilter}".</span>
          </Alert>
        )}

        {!loading && filteredProblems.map((p) => (
          <Card key={p.id}>
            <CardTitle>#{p.id} - {p.title}</CardTitle>
            <CardMeta>
              {new Date(p.date_created).toLocaleDateString('uk-UA', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <StatusBadge $status={p.status}>{p.status}</StatusBadge>
              {p.assignee_name && (
                <span style={{ color: '#00e5ff', marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'var(--theme-font-mono)' }}>
                  [Майстер: {p.assignee_name}]
                </span>
              )}
              {p.price_status === 'accepted' && p.proposed_price && (
                <span style={{ color: '#00ff9d', marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'var(--theme-font-mono)', border: '1px solid #00ff9d', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                  💸 Узгоджена ціна: {p.proposed_price} грн
                </span>
              )}
            </CardMeta>
            <CardBody style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {p.description}
            </CardBody>

            <RowActions>
              <Button as={Link} to={`/requests/${p.id}`} $variant="cyan">
                <span>Деталі та коментарі</span>
              </Button>
              {p.status === 'Завершено' && (
                <Button as={Link} to={`/service-record/${p.id}`} $variant="green">
                  <span>Талон обслуговування</span>
                </Button>
              )}
            </RowActions>
          </Card>
        ))}
      </ContentWrapper>
      <Footer />
    </>
  )
}

const TopRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
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
