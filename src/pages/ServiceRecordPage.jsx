import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import Navbar from '../components/Navbar'
import {
  ContentWrapper, SectionTitle, Card, CardTitle, CardBody, CardMeta,
  StatusBadge, Panel, Pre, Spinner, Alert, Button, Mono,
} from '../components/ui'
import { getServiceRecord } from '../api/client'

export default function ServiceRecordPage() {
  const { id } = useParams()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    getServiceRecord(id)
      .then(({ data }) => setData(data))
      .catch(() => setError('Не вдалося завантажити талон'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Талон обслуговування</SectionTitle>

        {loading && <Spinner />}
        {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}

        {data && (
          <>
            <Card style={{ marginBottom: '1.5rem' }}>
              <CardTitle>{data.problem.title}</CardTitle>
              <CardMeta>
                {new Date(data.problem.date_created).toLocaleDateString('uk-UA')}
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <StatusBadge $status={data.problem.status}>{data.problem.status}</StatusBadge>
              </CardMeta>
              <CardBody>{data.problem.description}</CardBody>
            </Card>

            <Panel $wide style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <Section style={{ margin: 0 }}>
                <SLabel>📅 Час прийому</SLabel>
                <div style={{ fontSize: '0.9rem', color: '#c9d1d9', fontFamily: 'var(--theme-font-mono)' }}>
                  {new Date(data.problem.date_created).toLocaleString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </Section>
              <Section style={{ margin: 0 }}>
                <SLabel>📤 Час видачі</SLabel>
                <div style={{ fontSize: '0.9rem', color: '#c9d1d9', fontFamily: 'var(--theme-font-mono)' }}>
                  {data.service_record?.date_completed ? new Date(data.service_record.date_completed).toLocaleString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </Section>
              <Section style={{ margin: 0 }}>
                <SLabel>💰 Узгоджена ціна</SLabel>
                <div style={{ fontSize: '0.9rem', color: '#00ff9d', fontWeight: 'bold', fontFamily: 'var(--theme-font-mono)' }}>
                  {data.problem.proposed_price ? `${data.problem.proposed_price} грн` : '—'}
                </div>
              </Section>
            </Panel>

            <Panel $wide>
              <Section>
                <SLabel>Опис виконаної роботи</SLabel>
                <Pre>{data.service_record.work_done}</Pre>
              </Section>

              <Section>
                <SLabel>Використані матеріали</SLabel>
                <Pre>{data.service_record.parts_used || '—'}</Pre>
              </Section>

              <Section>
                <SLabel>Інформаційний талон / Гарантія</SLabel>
                <Pre>{data.service_record.warranty_info}</Pre>
              </Section>
            </Panel>

            <div style={{ marginTop: '1.5rem' }}>
              <Button as={Link} to="/requests">
                <span>← Назад до заявок</span>
              </Button>
            </div>
          </>
        )}
      </ContentWrapper>
    </>
  )
}

const Section = styled.div`
  margin-bottom: 1.5rem;
  &:last-child { margin-bottom: 0; }
`

const SLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
`
