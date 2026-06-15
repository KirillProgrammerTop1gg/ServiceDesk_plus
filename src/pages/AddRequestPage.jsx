import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  ContentWrapper, SectionTitle, Panel, FormGroup, FormLabel,
  Input, Textarea, Button, Alert,
} from '../components/ui'
import { addProblem, refineProblemAI } from '../api/client'
import { keyframes } from 'styled-components'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`

const scanline = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

export default function AddRequestPage() {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [file, setFile]         = useState(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProposal, setAiProposal] = useState(null)
  const navigate = useNavigate()

  const handleAiRefine = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Будь ласка, заповніть назву та опис перед запуском покращення через ШІ!')
      return
    }
    setError('')
    setAiLoading(true)
    setAiProposal(null)
    try {
      const res = await refineProblemAI(title, description)
      setAiProposal(res.data)
    } catch (err) {
      setError('Не вдалося зв’язатися з ШІ для оптимізації тексту.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAi = () => {
    if (aiProposal) {
      setTitle(aiProposal.title)
      setDesc(aiProposal.description)
      setAiProposal(null)
      setSuccess('Рекомендації ШІ успішно застосовано!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const handleDiscardAi = () => {
    setAiProposal(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('description', description)
      if (file) fd.append('img', file)
      await addProblem(fd)
      setSuccess(`Заявку "${title}" успішно створено!`)
      setTimeout(() => navigate('/requests'), 1800)
    } catch {
      setError('Помилка при відправці заявки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Нова заявка</SectionTitle>

        <Panel $wide>
          {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}
          {success && <Alert $type="success"><span>&#x2713;</span><span>{success}</span></Alert>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="title">Назва проблеми</FormLabel>
              <Input
                id="title"
                type="text"
                placeholder="Коротко опишіть проблему"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="description">Детальний опис</FormLabel>
              <Textarea
                id="description"
                placeholder="Опишіть проблему якомога детальніше..."
                rows={5}
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                maxLength="1000"
                required
              />
            </FormGroup>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                $variant="cyan"
                style={{ height: '38px', padding: '0 1.2rem', fontSize: '0.75rem' }}
                disabled={aiLoading || !title.trim() || !description.trim()}
                onClick={handleAiRefine}
              >
                <span>{aiLoading ? '✨ Аналіз та покращення...' : '✨ Покращити та класифікувати через ШІ'}</span>
              </Button>
            </div>

            {aiLoading && (
              <AiLoadingContainer>
                <AiPulseText>✨ ШІ аналізує вашу проблему та створює оптимальний технічний опис...</AiPulseText>
                <AiLoadingBar />
              </AiLoadingContainer>
            )}

            {aiProposal && (
              <AiRefinementSection>
                <AiRefineTitle>✨ Пропозиція оптимізації від ШІ</AiRefineTitle>
                <p style={{ fontSize: '0.8rem', color: '#5a7a9a', marginBottom: '1rem' }}>
                  ШІ автоматично визначив технічну категорію та оптимізував текст для більш швидкого прийняття майстром.
                </p>
                
                <AiGrid>
                  <AiCard className="original">
                    <div style={{ fontSize: '0.7rem', color: '#5a7a9a', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: 'Share Tech Mono' }}>Ваш оригінал</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: '#e8f4ff' }}>{title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#5a7a9a', whiteSpace: 'pre-wrap' }}>{description}</div>
                  </AiCard>
                  
                  <AiCard className="proposal">
                    <div style={{ fontSize: '0.7rem', color: '#00ff9d', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: 'Share Tech Mono' }}>Пропозиція ШІ</div>
                    <div style={{ marginBottom: '0.4rem' }}>
                      <AiTag>{aiProposal.category || 'Апаратне забезпечення'}</AiTag>
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: '#00e5ff' }}>{aiProposal.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#5a7a9a', whiteSpace: 'pre-wrap' }}>{aiProposal.description}</div>
                  </AiCard>
                </AiGrid>

                {aiProposal.note && (
                  <p style={{ fontSize: '0.7rem', color: '#00ff9d', marginTop: '0.8rem', fontFamily: 'Share Tech Mono', letterSpacing: '0.05em' }}>
                    💡 {aiProposal.note}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    $variant="red"
                    style={{ height: '36px', padding: '0 1rem', fontSize: '0.7rem' }}
                    onClick={handleDiscardAi}
                  >
                    <span>❌ Відхилити</span>
                  </Button>
                  <Button
                    type="button"
                    $variant="green"
                    style={{ height: '36px', padding: '0 1.2rem', fontSize: '0.7rem' }}
                    onClick={handleApplyAi}
                  >
                    <span>✓ Застосувати покращення</span>
                  </Button>
                </div>
              </AiRefinementSection>
            )}

            <FormGroup>
              <FormLabel htmlFor="img">Фото (необов'язково)</FormLabel>
              <FileInput
                id="img"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && (
                <FileName>&#128190; {file.name}</FileName>
              )}
            </FormGroup>

            <Button $block $variant="green" type="submit" disabled={loading}>
              <span>{loading ? 'Відправка...' : 'Надіслати заявку'}</span>
            </Button>
          </form>
        </Panel>
      </ContentWrapper>
      <Footer />
    </>
  )
}

const FileInput = styled.input`
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  cursor: pointer;

  &::file-selector-button {
    background: transparent;
    border: 1px solid ${({ theme }) => theme.colors.cyanDim};
    color: ${({ theme }) => theme.colors.cyan};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.7rem;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
    margin-right: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: background 0.2s;

    &:hover { background: ${({ theme }) => theme.colors.cyanGlow}; }
  }
`

const FileName = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.green};
  margin-top: 0.4rem;
  letter-spacing: 0.05em;
`

const AiLoadingContainer = styled.div`
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(13, 22, 40, 0.4);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
`

const AiPulseText = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.cyan};
  animation: ${pulse} 2s infinite ease-in-out;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  text-align: center;
`

const AiLoadingBar = styled.div`
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    ${({ theme }) => theme.colors.cyan} 50%, 
    transparent 100%
  );
  background-size: 200% 100%;
  animation: ${scanline} 1.5s infinite linear;
`

const AiRefinementSection = styled.div`
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(11, 18, 32, 0.8);
  border: 1px solid ${({ theme }) => theme.colors.borderGlow};
  box-shadow: 0 0 15px rgba(10, 74, 255, 0.15);
  border-radius: 4px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 3px;
    background: ${({ theme }) => theme.colors.cyan};
    box-shadow: 0 0 10px ${({ theme }) => theme.colors.cyan};
  }
`

const AiRefineTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.9rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.cyan};
  margin-bottom: 0.4rem;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
`

const AiGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.2rem;
  margin: 1rem 0;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

const AiCard = styled.div`
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem;
  border-radius: 4px;
  
  &.original {
    border-left: 3px solid ${({ theme }) => theme.colors.textSecondary};
  }
  
  &.proposal {
    border-left: 3px solid ${({ theme }) => theme.colors.green};
    box-shadow: 0 0 10px rgba(0, 255, 157, 0.05);
  }
`

const AiTag = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.5rem;
  border-radius: 2px;
  background: rgba(0, 255, 157, 0.1);
  color: ${({ theme }) => theme.colors.green};
  border: 1px solid ${({ theme }) => theme.colors.green}40;
  box-shadow: 0 0 8px rgba(0, 255, 157, 0.1);
`
