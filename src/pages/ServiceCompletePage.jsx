import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  ContentWrapper, SectionTitle, Panel, FormGroup, FormLabel,
  Textarea, Button, Alert,
} from '../components/ui'
import { completeService } from '../api/client'

export default function ServiceCompletePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workDone, setWorkDone]   = useState('')
  const [partsUsed, setPartsUsed] = useState('')
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await completeService(id, workDone, partsUsed)
      setSuccess('Запис додано! Заявку завершено.')
      setTimeout(() => navigate('/admin/my-problems'), 1800)
    } catch {
      setError('Не вдалося завершити заявку')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Завершення ремонту</SectionTitle>

        <Panel $wide>
          {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}
          {success && <Alert $type="success"><span>&#x2713;</span><span>{success}</span></Alert>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="work_done">Виконаний обсяг робіт</FormLabel>
              <Textarea
                id="work_done"
                placeholder="Опишіть що саме було зроблено..."
                rows={5}
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="parts_used">Використані матеріали</FormLabel>
              <Textarea
                id="parts_used"
                placeholder="Перелік деталей та матеріалів (необов'язково)..."
                rows={4}
                value={partsUsed}
                onChange={(e) => setPartsUsed(e.target.value)}
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button $block $variant="green" type="submit" disabled={loading}>
                <span>{loading ? 'Збереження...' : 'Завершити заявку'}</span>
              </Button>
              <Button as={Link} to="/admin/my-problems" style={{ flexShrink: 0 }}>
                <span>Скасувати</span>
              </Button>
            </div>
          </form>
        </Panel>
      </ContentWrapper>
      <Footer />
    </>
  )
}
