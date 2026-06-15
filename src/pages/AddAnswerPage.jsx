import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  ContentWrapper, SectionTitle, Panel, FormGroup, FormLabel,
  Textarea, Button, Alert,
} from '../components/ui'
import { addAnswer } from '../api/client'

export default function AddAnswerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await addAnswer(id, message)
      setSuccess('Відповідь збережена!')
      setTimeout(() => navigate('/admin/my-problems'), 1500)
    } catch {
      setError('Не вдалося зберегти відповідь')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Відповідь клієнту</SectionTitle>

        <Panel $wide>
          {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}
          {success && <Alert $type="success"><span>&#x2713;</span><span>{success}</span></Alert>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="message">Ваша відповідь</FormLabel>
              <Textarea
                id="message"
                placeholder="Напишіть відповідь клієнту..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button $block $variant="green" type="submit" disabled={loading}>
                <span>{loading ? 'Збереження...' : 'Зберегти відповідь'}</span>
              </Button>
              <Button as={Link} to="/admin/my-problems" style={{ flexShrink: 0 }}>
                <span>Скасувати</span>
              </Button>
            </div>
          </form>
        </Panel>
      </ContentWrapper>
    </>
  )
}
