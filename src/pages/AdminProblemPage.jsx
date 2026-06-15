import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import {
  ContentWrapper, SectionTitle, Panel, CardTitle, CardBody,
  CardMeta, RowActions, Button, Spinner, Alert, FormGroup, FormLabel,
  Input, Textarea, Mono, Pre, StatusBadge, Divider, PanelCorners,
  PanelTitle, PanelSubtitle
} from '../components/ui'
import {
  getProblem,
  getAdminMasters,
  approveProblem,
  declineProblem,
  assignMaster,
  takeProblem,
  updateProblemNotes,
  submitCompletionRequest,
  approveCompletion,
  rejectCompletion,
  getMessage,
  addAnswer,
  deleteProblem,
  markAnswerRead,
  proposePrice,
  cancelPrice,
  acceptNegotiation,
  submitMasterRequest,
  cancelMasterRequest,
  acceptMasterRequest,
  postPayment,
  confirmPayment,
  refineCommentAI
} from '../api/client'


function AiRephraseWidget({ text, onApply }) {
  const [loading, setLoading] = useState(false)
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')

  const handleRefine = async () => {
    if (!text || !text.trim()) return
    setLoading(true)
    setError('')
    setProposal(null)
    try {
      const res = await refineCommentAI(text)
      setProposal(res.data.refined_text)
    } catch (err) {
      setError('Не вдалося задіяти ШІ для реврайту.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    onApply(proposal)
    setProposal(null)
  }

  const handleCancel = () => {
    setProposal(null)
  }

  return (
    <div style={{ marginTop: '0.4rem', fontFamily: 'Share Tech Mono' }}>
      {!proposal && !loading && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span 
            onClick={handleRefine}
            style={{ 
              color: text && text.trim() ? '#00e5ff' : '#2a4060', 
              fontSize: '0.72rem', 
              cursor: text && text.trim() ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              transition: 'all 0.2s',
              borderBottom: text && text.trim() ? '1px dashed #00e5ff' : 'none',
              paddingBottom: '2px'
            }}
          >
            ✨ Офіційний тон через ШІ
          </span>
        </div>
      )}

      {loading && (
        <div style={{ fontSize: '0.72rem', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>✨ ШІ перефразовує в офіційний тон...</span>
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.7rem', color: '#ff3b5c', textAlign: 'right', marginTop: '0.2rem' }}>
          ⚠️ {error}
        </div>
      )}

      {proposal && (
        <div style={{ 
          background: 'rgba(13, 22, 40, 0.9)', 
          border: '1px solid #00ff9d', 
          boxShadow: '0 0 8px rgba(0, 255, 157, 0.15)',
          padding: '0.8rem', 
          borderRadius: '4px', 
          marginTop: '0.5rem',
          position: 'relative'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#00ff9d', textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>Пропозиція офіційного тону від ШІ:</div>
          <div style={{ fontSize: '0.8rem', color: '#e8f4ff', whiteSpace: 'pre-wrap', lineHeight: '1.4', fontFamily: 'sans-serif', marginBottom: '0.6rem' }}>
            {proposal}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={handleCancel}
              style={{
                background: 'transparent',
                border: '1px solid #ff3b5c',
                color: '#ff3b5c',
                fontSize: '0.65rem',
                padding: '0.2rem 0.6rem',
                cursor: 'pointer',
                fontFamily: 'Share Tech Mono',
                borderRadius: '2px'
              }}
            >
              ❌ Відхилити
            </button>
            <button 
              type="button" 
              onClick={handleAccept}
              style={{
                background: 'rgba(0, 255, 157, 0.1)',
                border: '1px solid #00ff9d',
                color: '#00ff9d',
                fontSize: '0.65rem',
                padding: '0.2rem 0.6rem',
                cursor: 'pointer',
                fontFamily: 'Share Tech Mono',
                borderRadius: '2px',
                boxShadow: '0 0 5px rgba(0, 255, 157, 0.2)'
              }}
            >
              ✓ Прийняти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


export default function AdminProblemPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [problem, setProblem] = useState(null)

  const hasActions = () => {
    if (!user || !problem) return false

    if (user.role === 'manager' || user.role === 'admin') {
      if (problem.status === 'На розгляді') return true
      if (problem.status === 'Прийнято' && !problem.admin_id) return true
      if (problem.status === 'Приймання ціни') {
        return true
      }
      if (problem.status === 'У роботі') {
        return problem.master_request_status === 'pending'
      }
      if (problem.status === 'Прийняття оплати') return true
    }

    if (user.role === 'master') {
      if (problem.status === 'Прийнято' && !problem.admin_id) return true
      if (problem.status === 'У роботі' && problem.admin_id === user.id) {
        return true
      }
    }

    return false
  }
  const [comments, setComments] = useState([])
  const [masters, setMasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Action states
  const [submitting, setSubmitting] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineForm, setShowDeclineForm] = useState(false)

  const [selectedMasterId, setSelectedMasterId] = useState('')

  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [workDoneText, setWorkDoneText] = useState('')
  const [partsUsedText, setPartsUsedText] = useState('')
  const [showCompletionForm, setShowCompletionForm] = useState(false)

  const [rejectRepairComment, setRejectRepairComment] = useState('')
  const [showRejectRepairForm, setShowRejectRepairForm] = useState(false)

  const [newCommentText, setNewCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [isCommentPrivate, setIsCommentPrivate] = useState(false)

  // New Workflow States
  const [proposePriceValue, setProposePriceValue] = useState('')
  const [masterReqType, setMasterReqType] = useState('close')
  const [masterReqComment, setMasterReqComment] = useState('')
  const [masterReqWorkDone, setMasterReqWorkDone] = useState('')
  const [masterReqPartsUsed, setMasterReqPartsUsed] = useState('')
  const [showMasterReqForm, setShowMasterReqForm] = useState(false)

  const [managerFormalComment, setManagerFormalComment] = useState('')
  const [managerTweakWork, setManagerTweakWork] = useState('')
  const [managerTweakParts, setManagerTweakParts] = useState('')

  const [paymentReqs, setPaymentReqs] = useState('')
  const [paymentInvoice, setPaymentInvoice] = useState(null)

  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    try {
      const problemRes = await getProblem(id)
      const probData = problemRes.data
      setProblem(probData)
      if (probData.notes) {
        setNotesText(probData.notes)
      } else {
        setNotesText('')
      }
      
      setManagerTweakWork(probData.completion_work_done || '')
      setManagerTweakParts(probData.completion_parts_used || '')
      setPaymentReqs(probData.payment_requisites || '')

      // Fetch comments/messages
      try {
        const commentsRes = await getMessage(id)
        setComments(commentsRes.data.answers)
      } catch (err) {
        console.warn('Could not fetch comments', err)
      }

      // If user is manager and status is 'Прийнято', fetch masters
      if (user && user.role === 'manager' && problemRes.data.status === 'Прийнято') {
        try {
          const mastersRes = await getAdminMasters()
          setMasters(mastersRes.data)
          if (mastersRes.data.length > 0) {
            setSelectedMasterId(mastersRes.data[0].id)
          }
        } catch (err) {
          console.warn('Could not fetch masters list', err)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося завантажити запит')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id, user])

  // Automatically mark comments as read when loaded, aligned with backend unread logic
  useEffect(() => {
    if (!user || !comments || !problem) return

    const role = user.role
    let shouldTriggerRead = false
    
    const updatedComments = comments.map((msg) => {
      let shouldMark = false
      
      if (msg.is_read) return msg
      
      const isPrivate = msg.is_private
      const senderRole = msg.admin_role || 'client'
      
      if (isPrivate) {
        if (role === 'master' && ['manager', 'admin'].includes(senderRole)) {
          shouldMark = true
        } else if (['manager', 'admin'].includes(role) && senderRole === 'master') {
          shouldMark = true
        }
      } else {
        if (role === 'client' && senderRole !== 'client') {
          shouldMark = true
        } else if (senderRole === 'client') {
          if (problem.admin_id === null && ['manager', 'admin'].includes(role)) {
            shouldMark = true
          } else if (problem.admin_id !== null && role === 'master') {
            shouldMark = true
          }
        }
      }
      
      if (shouldMark) {
        shouldTriggerRead = true
        return { ...msg, is_read: true }
      }
      return msg
    })

    if (shouldTriggerRead) {
      markAnswerRead(id).catch(() => {})
      setComments(updatedComments)
    }
  }, [comments, id, user, problem])

  const handleApprove = async () => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await approveProblem(id)
      setSuccess('Заявку успішно прийнято (статус "Прийнято")!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при схваленні заявки')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async (e) => {
    e.preventDefault()
    if (!declineReason.trim()) {
      setError('Будь ласка, вкажіть причину відхилення')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await declineProblem(id, declineReason)
      setSuccess('Заявку відхилено!')
      setShowDeclineForm(false)
      setDeclineReason('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при відхиленні заявки')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedMasterId) {
      setError('Будь ласка, виберіть майстра')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await assignMaster(id, selectedMasterId)
      setSuccess('Майстра призначено успішно (статус "У роботі")!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при призначенні майстра')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTake = async () => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await takeProblem(id)
      setSuccess('Ви взяли заявку в роботу (статус "Приймання ціни")!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при взятті заявки')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveNotes = async () => {
    setError('')
    setSuccess('')
    setSavingNotes(true)
    try {
      await updateProblemNotes(id, notesText)
      setSuccess('Нотатки успішно збережено!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при збереженні нотаток')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleCompletionSubmit = async (e) => {
    e.preventDefault()
    if (!workDoneText.trim()) {
      setError('Вкажіть виконані роботи')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await submitCompletionRequest(id, workDoneText, partsUsedText)
      setSuccess('Звіт про завершення надіслано менеджеру!')
      setShowCompletionForm(false)
      setWorkDoneText('')
      setPartsUsedText('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при надсиланні звіту')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveCompletion = async () => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await approveCompletion(id)
      setSuccess('Ремонт успішно затверджено, гарантійний талон згенеровано!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при затвердженні завершення')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectCompletion = async (e) => {
    e.preventDefault()
    if (!rejectRepairComment.trim()) {
      setError('Вкажіть коментар із зауваженнями для майстра')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await rejectCompletion(id, rejectRepairComment)
      setSuccess('Ремонт відхилено, заявку повернуто майстру на доопрацювання!')
      setShowRejectRepairForm(false)
      setRejectRepairComment('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при поверненні на доопрацювання')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return
    setError('')
    setSuccess('')
    setSendingComment(true)
    try {
      await addAnswer(id, newCommentText, isCommentPrivate)
      setSuccess(isCommentPrivate ? 'Внутрішній коментар додано!' : 'Коментар додано!')
      setNewCommentText('')
      setIsCommentPrivate(false)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося надіслати коментар')
    } finally {
      setSendingComment(false)
    }
  }

  const handleProposePriceSubmit = async (e) => {
    e.preventDefault()
    if (!proposePriceValue || isNaN(proposePriceValue) || Number(proposePriceValue) <= 0) {
      setError('Будь ласка, вкажіть коректну ціну (більше 0)')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await proposePrice(id, Number(proposePriceValue))
      setSuccess(`Ціну ${proposePriceValue} грн успішно запропоновано клієнту!`)
      setProposePriceValue('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при пропонуванні ціни')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelPrice = async () => {
    if (!window.confirm('Ви впевнені, що хочете скасувати запропоновану вартість?')) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await cancelPrice(id)
      setSuccess('Пропозицію вартості скасовано!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при скасуванні пропозиції ціни')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptNegotiation = async () => {
    if (!window.confirm(`Ви впевнені, що хочете прийняти зустрічну пропозицію клієнта в розмірі ${problem.proposed_price} грн?`)) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await acceptNegotiation(id)
      setSuccess(`Узгоджено ціну ${problem.proposed_price} грн! Статус змінено на "У роботі".`)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при прийнятті пропозиції торгу')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMasterRequestSubmit = async (e) => {
    e.preventDefault()
    if (!masterReqComment.trim()) {
      setError('Будь ласка, вкажіть коментар до запиту')
      return
    }
    if (masterReqType === 'end' && !masterReqWorkDone.trim()) {
      setError('Будь ласка, опишіть виконані роботи')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await submitMasterRequest(id, masterReqType, masterReqComment, masterReqWorkDone || null, masterReqPartsUsed || null)
      setSuccess('Запит успішно надіслано менеджеру!')
      setShowMasterReqForm(false)
      setMasterReqComment('')
      setMasterReqWorkDone('')
      setMasterReqPartsUsed('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при надсиланні запиту')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelMasterRequestClick = async () => {
    if (!window.confirm('Ви впевнені, що хочете скасувати свій запит?')) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await cancelMasterRequest(id)
      setSuccess('Запит успішно скасовано!')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при скасуванні запиту')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptMasterRequestSubmit = async (e) => {
    e.preventDefault()
    if (!managerFormalComment.trim()) {
      setError('Будь ласка, напишіть формальний коментар для клієнта')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await acceptMasterRequest(id, managerFormalComment, managerTweakWork || null, managerTweakParts || null)
      setSuccess('Запит майстра схвалено та надіслано клієнту!')
      setManagerFormalComment('')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при схваленні запиту')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePostPaymentSubmit = async (e) => {
    e.preventDefault()
    if (!paymentReqs.trim()) {
      setError('Будь ласка, вкажіть платіжні реквізити')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('requisites', paymentReqs)
      if (paymentInvoice) {
        formData.append('invoice', paymentInvoice)
      }
      await postPayment(id, formData)
      setSuccess('Реквізити та рахунок успішно надіслано клієнту!')
      setPaymentInvoice(null)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при відправленні реквізитів')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPaymentClick = async () => {
    if (!window.confirm('Ви впевнені, що оплату отримано та хочете завершити ремонт?')) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await confirmPayment(id)
      setSuccess('Оплату підтверджено! Ремонт завершено, гарантійний талон згенеровано.')
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Помилка при підтвердженні оплати')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProblem = async () => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю заявку?')) return
    setError('')
    setSuccess('')
    setDeleting(true)
    try {
      await deleteProblem(id)
      navigate('/admin')
    } catch (err) {
      setError('Помилка при видаленні заявки')
      setDeleting(false)
    }
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Панель керування заявкою #{id}</SectionTitle>

        {loading && <Spinner />}
        {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}
        {success && <Alert $type="success"><span>&#x2713;</span><span>{success}</span></Alert>}

        {!loading && problem && (
          <Grid>
            <MainColumn>
              <Panel $wide>
                <PanelCorners />
                <DetailHeader>
                  <CardTitle style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    {problem.title}
                  </CardTitle>
                  <StatusBadge $status={problem.status}>{problem.status}</StatusBadge>
                </DetailHeader>

                <CardMeta style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  Створено: {new Date(problem.date_created).toLocaleString('uk-UA')}
                  {problem.assignee_name && (
                    <span style={{ color: '#00e5ff', marginLeft: '1rem' }}>
                      [Майстер: {problem.assignee_name}]
                    </span>
                  )}
                </CardMeta>

                {problem.proposed_price !== null && problem.proposed_price !== undefined && (
                  <div style={{
                    margin: '1rem 0',
                    padding: '1rem',
                    background: 'rgba(0, 229, 255, 0.05)',
                    border: '1px dashed rgba(0, 229, 255, 0.25)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.05)',
                    marginBottom: '1.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💰</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#8b9eb0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Узгоджена / запропонована ціна
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <strong style={{ fontSize: '1.25rem', color: '#00ff9d', fontFamily: 'var(--theme-font-mono)' }}>
                          {problem.proposed_price} грн
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#8b9eb0' }}>
                          ({problem.price_status === 'accepted' ? 'Узгоджено/Прийнято клієнтом' : problem.price_status === 'negotiating' ? 'Зустрічна пропозиція клієнта (торг)' : problem.price_status === 'proposed' ? 'Запропоновано менеджером' : 'В процесі узгодження'})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <SectionHeading>Опис проблеми</SectionHeading>
                <CardBody style={{ whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
                  {problem.description}
                </CardBody>

                {problem.image_url && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <SectionHeading>Прикріплене зображення</SectionHeading>
                    <ProblemImage
                      src={`/static/${problem.image_url}`}
                      alt="Вигляд несправності"
                    />
                  </div>
                )}

                {/* Workflow Actions Section */}
                {hasActions() && (
                  <>
                    <Divider>Дії з заявкою</Divider>
                    <ActionPanel>
                      {/* MANAGER WORKFLOW */}
                      {user && user.role === 'manager' && (
                        <>
                          {problem.status === 'На розгляді' && (
                            <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#ffb300', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            ⚙️ Розгляд нової заявки
                          </Mono>
                          <RowActions>
                            <Button $variant="green" onClick={handleApprove} disabled={submitting}>
                              <span>{submitting ? 'Обробка...' : 'Прийняти заявку'}</span>
                            </Button>
                            <Button $variant="red" onClick={() => setShowDeclineForm(!showDeclineForm)} disabled={submitting}>
                              <span>{showDeclineForm ? 'Приховати' : 'Відхилити...'}</span>
                            </Button>
                          </RowActions>

                          {showDeclineForm && (
                            <StyledForm onSubmit={handleDecline} style={{ marginTop: '1rem' }}>
                              <FormGroup>
                                <FormLabel htmlFor="declineReason">Коментар / Причина відхилення</FormLabel>
                                <Textarea
                                  id="declineReason"
                                  placeholder="Вкажіть причину відхилення для клієнта..."
                                  value={declineReason}
                                  onChange={(e) => setDeclineReason(e.target.value)}
                                  rows={3}
                                  required
                                />
                                <AiRephraseWidget
                                  text={declineReason}
                                  onApply={setDeclineReason}
                                />
                              </FormGroup>
                              <Button $variant="red" type="submit" disabled={submitting}>
                                <span>Підтвердити відхилення</span>
                              </Button>
                            </StyledForm>
                          )}
                        </ActionGroup>
                      )}

                      {problem.status === 'Прийнято' && !problem.admin_id && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#00e5ff', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            ⚙️ Призначення майстра
                          </Mono>
                          <FormGroup style={{ maxWidth: '300px' }}>
                            <FormLabel htmlFor="masterSelect">Оберіть вільного майстра</FormLabel>
                            <StyledSelect
                              id="masterSelect"
                              value={selectedMasterId}
                              onChange={(e) => setSelectedMasterId(e.target.value)}
                            >
                              <option value="">-- Оберіть --</option>
                              {masters.map((m) => (
                                <option key={m.id} value={m.id}>
                                  [ID: {m.id}] {m.username} ({m.email})
                                </option>
                              ))}
                            </StyledSelect>
                          </FormGroup>
                          <Button $variant="green" onClick={handleAssign} disabled={submitting || !selectedMasterId}>
                            <span>{submitting ? 'Обробка...' : 'Призначити'}</span>
                          </Button>
                        </ActionGroup>
                      )}

                      {problem.status === 'Приймання ціни' && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#ff9d00', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            ⚙️ Узгодження вартості (Менеджер)
                          </Mono>
                          
                          {problem.price_status === 'proposed' ? (
                            <div style={{ marginTop: '0.5rem' }}>
                              <Alert $type="info" style={{ marginBottom: '1rem' }}>
                                <span>⏳</span>
                                <span>Запропоновано вартість: <strong>{problem.proposed_price} грн</strong>. Очікуємо підтвердження або відхилення клієнтом на сайті.</span>
                              </Alert>
                              {(user?.role === 'manager' || user?.role === 'admin') && (
                                <Button $variant="red" onClick={handleCancelPrice} disabled={submitting}>
                                  <span>{submitting ? 'Скасування...' : 'Скасувати пропозицію'}</span>
                                </Button>
                              )}
                            </div>
                          ) : problem.price_status === 'negotiating' ? (
                            <div style={{ marginTop: '0.5rem' }}>
                              <Alert $type="warning" style={{ marginBottom: '1rem' }}>
                                <span>🤝</span>
                                <span>Клієнт пропонує зустрічну вартість (торг): <strong>{problem.proposed_price} грн</strong>. Ви можете прийняти цю ціну або запропонувати нову.</span>
                              </Alert>
                              <RowActions style={{ marginBottom: '1.5rem' }}>
                                <Button $variant="green" onClick={handleAcceptNegotiation} disabled={submitting}>
                                  <span>{submitting ? 'Прийняття...' : `✓ Прийняти пропозицію (${problem.proposed_price} грн)`}</span>
                                </Button>
                                <Button $variant="red" onClick={handleCancelPrice} disabled={submitting}>
                                  <span>{submitting ? 'Скасування...' : 'Скасувати та обнулити'}</span>
                                </Button>
                              </RowActions>

                              <Divider style={{ margin: '1rem 0' }}>Або запропонувати іншу ціну</Divider>

                              <StyledForm onSubmit={handleProposePriceSubmit} style={{ marginTop: '0.5rem' }}>
                                <FormGroup style={{ maxWidth: '300px' }}>
                                  <FormLabel htmlFor="proposePriceInput">Нова сума пропозиції (грн)</FormLabel>
                                  <Input
                                    id="proposePriceInput"
                                    type="number"
                                    placeholder="Наприклад: 1200"
                                    value={proposePriceValue}
                                    onChange={(e) => setProposePriceValue(e.target.value)}
                                    required
                                  />
                                </FormGroup>
                                <Button $variant="green" type="submit" disabled={submitting}>
                                  <span>{submitting ? 'Надсилання...' : 'Надіслати нову пропозицію'}</span>
                                </Button>
                              </StyledForm>
                            </div>
                          ) : (
                            <StyledForm onSubmit={handleProposePriceSubmit} style={{ marginTop: '0.5rem' }}>
                              <p style={{ fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '1rem' }}>
                                Обговоріть вартість у чаті, оцініть запчастини та вкажіть кінцеву ціну для клієнта:
                              </p>
                              <FormGroup style={{ maxWidth: '300px' }}>
                                <FormLabel htmlFor="proposePriceInput">Сума пропозиції (грн)</FormLabel>
                                <Input
                                  id="proposePriceInput"
                                  type="number"
                                  placeholder="Наприклад: 1200"
                                  value={proposePriceValue}
                                  onChange={(e) => setProposePriceValue(e.target.value)}
                                  required
                                />
                              </FormGroup>
                              <Button $variant="green" type="submit" disabled={submitting}>
                                <span>{submitting ? 'Надсилання...' : 'Надіслати пропозицію клієнту'}</span>
                              </Button>
                            </StyledForm>
                          )}
                        </ActionGroup>
                      )}

                      {problem.status === 'У роботі' && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#00ff9d', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            ⚙️ Керування ремонтом (Менеджер)
                          </Mono>

                          {problem.master_request_status === 'pending' ? (
                            <div style={{ background: '#07162c', padding: '1rem', border: '1px solid #0d2040', borderRadius: '4px', marginTop: '0.5rem' }}>
                              <h5 style={{ color: '#ff9d00', fontSize: '0.85rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                                ⚠️ Отримано новий запит від майстра: {problem.master_request_type === 'close' ? 'Закриття/Скасування' : 'Завершення ремонту'}
                              </h5>
                              
                              <p style={{ fontSize: '0.85rem', color: '#8b9eb0', margin: '0 0 0.5rem 0' }}>
                                <strong>Коментар майстра (приватний):</strong>
                              </p>
                              <Pre style={{ background: '#030a1c', padding: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: problem.master_request_comment }} />

                              {problem.master_request_type === 'end' && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                  <p style={{ fontSize: '0.85rem', color: '#8b9eb0', margin: '0 0 0.25rem 0' }}><strong>Виконані роботи (майстер):</strong></p>
                                  <Pre style={{ background: '#030a1c', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: problem.completion_work_done }} />
                                  <p style={{ fontSize: '0.85rem', color: '#8b9eb0', margin: '0 0 0.25rem 0' }}><strong>Використані запчастини (майстер):</strong></p>
                                  <Pre style={{ background: '#030a1c', padding: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: problem.completion_parts_used || 'немає' }} />
                                </div>
                              )}

                              <Alert $type="info" style={{ marginBottom: '1rem' }}>
                                <span>ℹ</span>
                                <span>Ви не можете відхилити цей запит. Тільки майстер може скасувати його, або ви можете узгодити деталі в приватних нотатках/чаті. Щоб прийняти, напишіть формальний коментар, який побачить клієнт.</span>
                              </Alert>

                              <StyledForm onSubmit={handleAcceptMasterRequestSubmit}>
                                {problem.master_request_type === 'end' && (
                                  <>
                                    <FormGroup>
                                      <FormLabel htmlFor="tweakWorkInput">Опис робіт (формальний вигляд для клієнта)</FormLabel>
                                      <Textarea
                                        id="tweakWorkInput"
                                        placeholder="Вкажіть формальний опис робіт..."
                                        value={managerTweakWork}
                                        onChange={(e) => setManagerTweakWork(e.target.value)}
                                        rows={3}
                                        required
                                      />
                                    </FormGroup>
                                    <FormGroup>
                                      <FormLabel htmlFor="tweakPartsInput">Деталі/Запчастини (формальний вигляд)</FormLabel>
                                      <Input
                                        id="tweakPartsInput"
                                        type="text"
                                        placeholder="Наприклад: Новий SSD Kingston 500GB..."
                                        value={managerTweakParts}
                                        onChange={(e) => setManagerTweakParts(e.target.value)}
                                      />
                                    </FormGroup>
                                  </>
                                )}

                                <FormGroup>
                                  <FormLabel htmlFor="formalComment">Формальний коментар менеджера для клієнта</FormLabel>
                                  <Textarea
                                    id="formalComment"
                                    placeholder="Цей коментар буде опубліковано у публічний чат як фінальний висновок..."
                                    value={managerFormalComment}
                                    onChange={(e) => setManagerFormalComment(e.target.value)}
                                    rows={3}
                                    required
                                  />
                                  <AiRephraseWidget
                                    text={managerFormalComment}
                                    onApply={setManagerFormalComment}
                                  />
                                </FormGroup>

                                <Button $variant="green" type="submit" disabled={submitting}>
                                  <span>✓ Підтвердити та відправити клієнту</span>
                                </Button>
                              </StyledForm>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.5rem' }}>
                              <Alert $type="info" style={{ marginBottom: 0 }}>
                                <span>🔧</span>
                                <span>Майстер виконує ремонтні роботи. Запит відсутній. Ви можете спілкуватися з ним за допомогою приватних нотаток праворуч.</span>
                              </Alert>
                            </div>
                          )}
                        </ActionGroup>
                      )}


                      {problem.status === 'Прийняття оплати' && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#d500f9', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            ⚙️ Етап оплати та перевірки (Менеджер)
                          </Mono>

                          {/* Master's Rework / Report section */}
                          <div style={{ background: '#07162c', padding: '1rem', border: '1px solid #0d2040', borderRadius: '4px', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                            <h5 style={{ color: '#00ff9d', fontSize: '0.85rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                              📋 Звіт про виконані роботи від майстра:
                            </h5>
                            <p style={{ fontSize: '0.85rem', color: '#8b9eb0', margin: '0 0 0.25rem 0' }}><strong>Виконані роботи:</strong></p>
                            <Pre style={{ background: '#030a1c', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: problem.completion_work_done || 'Не вказано' }} />
                            <p style={{ fontSize: '0.85rem', color: '#8b9eb0', margin: '0 0 0.25rem 0' }}><strong>Використані запчастини:</strong></p>
                            <Pre style={{ background: '#030a1c', padding: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: problem.completion_parts_used || 'немає' }} />
                            
                            {/* Return to rework removed by user request */}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            {problem.payment_client_marked ? (
                              <div style={{ borderBottom: '1px dashed #0d2040', paddingBottom: '1.25rem', marginBottom: '0.5rem' }}>
                                <Alert $type="info" style={{ marginBottom: '1rem' }}>
                                  <span>🔒</span>
                                  <span>Зміна платіжних реквізитів заблокована, оскільки клієнт позначив замовлення як оплачене.</span>
                                </Alert>
                                <div style={{ background: '#030a1c', padding: '0.75rem', border: '1px solid #0d2040', borderRadius: '4px', fontSize: '0.85rem' }}>
                                  <p style={{ color: '#00e5ff', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Надіслані реквізити:</p>
                                  <Pre style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', color: '#c9d1d9' }}>{problem.payment_requisites || 'немає'}</Pre>
                                </div>
                              </div>
                            ) : (
                              <StyledForm onSubmit={handlePostPaymentSubmit} style={{ borderBottom: '1px dashed #0d2040', paddingBottom: '1.25rem', marginBottom: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '1rem' }}>
                                  {problem.payment_requisites ? 'Оновити платіжні реквізити та рахунок:' : 'Надіслати клієнту реквізити для оплати та рахунок:'}
                                </p>
                                <FormGroup>
                                  <FormLabel htmlFor="paymentReqsInput">Платіжні реквізити (карта, IBAN, тощо)</FormLabel>
                                  <Textarea
                                    id="paymentReqsInput"
                                    placeholder="Вкажіть IBAN, банк, суму та призначення платежу..."
                                    value={paymentReqs}
                                    onChange={(e) => setPaymentReqs(e.target.value)}
                                    rows={3}
                                    required
                                  />
                                </FormGroup>
                                <FormGroup>
                                  <FormLabel htmlFor="invoiceFileInput">Прикріпити рахунок-фактуру (PDF або картинка)</FormLabel>
                                  <CustomFileLabel htmlFor="invoiceFileInput" $hasFile={!!paymentInvoice}>
                                    <span>📂 {paymentInvoice ? paymentInvoice.name : 'Виберіть файл рахунку...'}</span>
                                  </CustomFileLabel>
                                  <input
                                    id="invoiceFileInput"
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => setPaymentInvoice(e.target.files[0])}
                                    style={{ display: 'none' }}
                                  />
                                </FormGroup>
                                <Button $variant="green" type="submit" disabled={submitting}>
                                  <span>{submitting ? 'Надсилання...' : '✓ Надіслати рахунок'}</span>
                                </Button>
                              </StyledForm>
                            )}

                            {problem.payment_client_marked ? (
                              <div style={{ background: 'rgba(0, 255, 157, 0.05)', padding: '1rem', border: '1px solid #00ff9d', borderRadius: '4px' }}>
                                <p style={{ color: '#00ff9d', fontWeight: 'bold', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                                  💰 Клієнт повідомив, що оплату здійснено!
                                </p>
                                <p style={{ fontSize: '0.85rem', color: '#c9d1d9', margin: '0 0 1rem 0' }}>
                                  Будь ласка, перевірте надходження коштів на вказані реквізити. Якщо все вірно, підтвердіть оплату для остаточного закриття заявки.
                                </p>
                                <Button $variant="green" onClick={handleConfirmPaymentClick} disabled={submitting}>
                                  <span>{submitting ? 'Завершення...' : '✓ Підтвердити отримання оплати'}</span>
                                </Button>
                              </div>
                            ) : (
                              <Alert $type="info" style={{ marginBottom: 0 }}>
                                <span>⏳</span>
                                <span>Очікуємо, поки клієнт здійснить оплату та позначить це на сайті.</span>
                              </Alert>
                            )}
                          </div>
                        </ActionGroup>
                      )}
                    </>
                  )}

                  {/* MASTER WORKFLOW */}
                  {user && user.role === 'master' && (
                    <>
                      {problem.status === 'Прийнято' && !problem.admin_id && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#00e5ff', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            🔧 Самостійний вибір заявки
                          </Mono>
                          <Button $variant="green" onClick={handleTake} disabled={submitting}>
                            <span>{submitting ? 'Обробка...' : 'Взяти заявку в роботу'}</span>
                          </Button>
                        </ActionGroup>
                      )}

                      {problem.status === 'Приймання ціни' && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#ff9d00', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            🔧 Узгодження вартості (Майстер)
                          </Mono>
                          <Alert $type="info" style={{ marginBottom: 0 }}>
                            <span>⏳</span>
                            <span>Заявка перебуває на етапі узгодження ціни. Менеджер формує пропозицію для клієнта. Ви можете коментувати у публічному чаті нижче.</span>
                          </Alert>
                        </ActionGroup>
                      )}

                      {problem.status === 'У роботі' && problem.admin_id === user.id && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#00ff9d', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            🔧 Ремонт в процесі (Майстер)
                          </Mono>

                          {problem.master_request_status === 'pending' ? (
                            <div style={{ marginTop: '0.5rem' }}>
                              <Alert $type="info" style={{ marginBottom: '1rem' }}>
                                <span>⏳</span>
                                <span>Ви надіслали запит на <strong>{problem.master_request_type === 'close' ? 'закриття' : 'завершення ремонту'}</strong> з коментарем: <em dangerouslySetInnerHTML={{ __html: `"${problem.master_request_comment}"` }} />. Очікуйте на затвердження менеджером.</span>
                              </Alert>
                              <Button $variant="red" onClick={handleCancelMasterRequestClick} disabled={submitting}>
                                <span>{submitting ? 'Скасування...' : 'Скасувати/Відкликати запит'}</span>
                              </Button>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.5rem' }}>
                              <p style={{ fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '1rem' }}>
                                Виконайте необхідні діагностику та ремонт. Після завершення створіть запит менеджера на закриття або завершення. Клієнт НЕ бачить цей запит безпосередньо.
                              </p>
                              <Button $variant="green" onClick={() => setShowMasterReqForm(!showMasterReqForm)}>
                                <span>{showMasterReqForm ? 'Сховати форму запиту' : 'Створити запит менеджера'}</span>
                              </Button>

                              {showMasterReqForm && (
                                <StyledForm onSubmit={handleMasterRequestSubmit} style={{ marginTop: '1rem', borderTop: '1px solid #0d2040', paddingTop: '1rem' }}>
                                  <FormGroup>
                                    <FormLabel htmlFor="masterReqTypeSelect">Тип запиту</FormLabel>
                                    <StyledSelect
                                      id="masterReqTypeSelect"
                                      value={masterReqType}
                                      onChange={(e) => setMasterReqType(e.target.value)}
                                    >
                                      <option value="close">Запит на закриття (скасування ремонту/неремонтопридатне)</option>
                                      <option value="end">Запит на завершення ремонту (ремонт виконано успішно)</option>
                                    </StyledSelect>
                                  </FormGroup>

                                  {masterReqType === 'end' && (
                                    <>
                                      <FormGroup>
                                        <FormLabel htmlFor="masterReqWorkDoneInput">Виконані роботи</FormLabel>
                                        <Textarea
                                          id="masterReqWorkDoneInput"
                                          placeholder="Детально опишіть виконану роботу..."
                                          value={masterReqWorkDone}
                                          onChange={(e) => setMasterReqWorkDone(e.target.value)}
                                          rows={3}
                                          required
                                        />
                                      </FormGroup>
                                      <FormGroup>
                                        <FormLabel htmlFor="masterReqPartsInput">Використані запчастини (якщо є)</FormLabel>
                                        <Input
                                          id="masterReqPartsInput"
                                          type="text"
                                          placeholder="SSD, термопаста, тощо..."
                                          value={masterReqPartsUsed}
                                          onChange={(e) => setMasterReqPartsUsed(e.target.value)}
                                        />
                                      </FormGroup>
                                    </>
                                  )}

                                  <FormGroup>
                                    <FormLabel htmlFor="masterReqCommentInput">Приватний коментар для менеджера</FormLabel>
                                    <Textarea
                                      id="masterReqCommentInput"
                                      placeholder="Цей коментар побачить тільки менеджер, клієнт його не побачить..."
                                      value={masterReqComment}
                                      onChange={(e) => setMasterReqComment(e.target.value)}
                                      rows={3}
                                      required
                                    />
                                  </FormGroup>

                                  <Button $variant="green" type="submit" disabled={submitting}>
                                    <span>Надіслати запит менеджеру</span>
                                  </Button>
                                </StyledForm>
                              )}
                            </div>
                          )}
                        </ActionGroup>
                      )}

                      {problem.status === 'Прийняття оплати' && (
                        <ActionGroup>
                          <Mono $size="0.75rem" style={{ color: '#d500f9', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>
                            🔧 Етап оплати (Майстер)
                          </Mono>
                          <Alert $type="success" style={{ marginBottom: 0 }}>
                            <span>✓</span>
                            <span>Ремонт завершено та звіт успішно надіслано. Очікується оплата від клієнта та підтвердження менеджером. Дякуємо за роботу!</span>
                          </Alert>
                        </ActionGroup>
                      )}
                    </>
                  )}

                  {/* ADMIN WORKFLOW */}
                  {user && user.role === 'admin' && (
                    <ActionGroup>
                      <Alert $type="info" style={{ marginBottom: 0 }}>
                        <span>ℹ</span>
                        <span>У вас права адміністратора (Лише перегляд статистики та зміна ролей). Ви не можете змінювати стан заявок.</span>
                      </Alert>
                    </ActionGroup>
                  )}
                    </ActionPanel>
                  </>
                )}

                <div style={{ marginTop: '2rem' }}>
                  <Button as={Link} to="/admin">
                    <span>← До списку заявок</span>
                  </Button>
                </div>
              </Panel>
            </MainColumn>

            <SideColumn>
              {/* PRIVATE NOTES (Visible to Admin, Manager, and the assigned Master only) */}
              {user && (['admin', 'manager'].includes(user.role) || (user.role === 'master' && problem.admin_id === user.id)) && (
                <Panel style={{ marginBottom: '1.5rem' }} $compact>
                  <PanelCorners />
                  <PanelTitle $sm>🔒 Нотатки майстра</PanelTitle>
                  <PanelSubtitle>Бачать лише майстер, менеджер та адмін</PanelSubtitle>
                  
                  {user.role === 'master' && problem.status === 'У роботі' && problem.admin_id === user.id ? (
                    <div style={{ marginTop: '1rem' }}>
                      <FormGroup>
                        <Textarea
                          placeholder="Запишіть сюди внутрішні коментарі, номери деталей, замітки..."
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          rows={5}
                        />
                      </FormGroup>
                      <Button $block $variant="cyan" onClick={handleSaveNotes} disabled={savingNotes}>
                        <span>{savingNotes ? 'Збереження...' : 'Зберегти нотатки'}</span>
                      </Button>
                    </div>
                  ) : (
                    <Pre style={{ marginTop: '1rem' }}>
                      {problem.notes || 'Нотатки відсутні.'}
                    </Pre>
                  )}
                </Panel>
              )}

              {/* COMMENTS BLOCK (Visible to staff/everyone, segmented by is_private) */}
              <Panel $compact>
                <PanelCorners />
                <PanelTitle $sm>💬 Коментарі та Чат</PanelTitle>
                <PanelSubtitle>Публічний чат з клієнтом та приватні внутрішні нотатки</PanelSubtitle>

                <CommentsList>
                  {comments.length === 0 ? (
                    <div style={{ marginTop: '1rem', color: '#527a9c', fontSize: '0.8rem', fontFamily: 'var(--theme-font-mono)' }}>Коментарів немає.</div>
                  ) : (
                    comments.map((comment) => (
                      <CommentCard key={comment.id} $isPrivate={comment.is_private}>
                        <CommentHeader>
                          <Mono style={{ color: comment.is_private ? '#ff3b5c' : '#00e5ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{comment.admin_name}</span>
                            <CommentRoleBadge $role={comment.admin_role || 'client'}>
                              {roleTranslations[comment.admin_role] || 'Клієнт'}
                            </CommentRoleBadge>
                            {comment.is_private && (
                              <span style={{
                                color: '#ff3b5c',
                                fontSize: '0.65rem',
                                border: '1px solid #ff3b5c',
                                borderRadius: '2px',
                                padding: '0.1rem 0.3rem',
                                background: 'rgba(255, 59, 92, 0.1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontWeight: 'bold'
                              }}>
                                🔒 Внутрішня нотатка
                              </span>
                            )}
                          </Mono>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <Mono $muted $size="0.65rem">
                              {new Date(comment.date_responded).toLocaleString('uk-UA')}
                            </Mono>
                            <Mono $size="0.65rem" style={{ color: comment.is_read ? '#00a862' : '#ff3b5c' }}>
                              {comment.is_read ? '✓ Прочитано' : '✉ Не прочитано'}
                            </Mono>
                          </div>
                        </CommentHeader>
                        <CommentBody dangerouslySetInnerHTML={{ __html: comment.message }} />
                      </CommentCard>
                    ))
                  )}
                </CommentsList>

                {/* Add comment form */}
                {user && (user.role === 'manager' || (user.role === 'master' && problem.admin_id === user.id)) && (
                  ['Завершено', 'Відхилено'].includes(problem.status) ? (
                    <Alert $type="info" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                      <span>🔒</span>
                      <span>Обговорення цієї заявки закрито, оскільки вона має статус "{problem.status}".</span>
                    </Alert>
                  ) : (
                    <StyledForm onSubmit={handleSendComment} style={{ marginTop: '1.5rem', borderTop: '1px solid #0d2040', paddingTop: '1rem' }}>
                      <FormGroup style={{ marginBottom: '1rem' }}>
                        <FormLabel htmlFor="newComment">Додати новий коментар</FormLabel>
                        <Textarea
                          id="newComment"
                          placeholder={isCommentPrivate ? "Напишіть внутрішню нотатку (тільки для персоналу)..." : "Напишіть повідомлення для клієнта..."}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          rows={3}
                          required
                        />
                        <AiRephraseWidget
                          text={newCommentText}
                          onApply={setNewCommentText}
                        />
                        <div style={{ marginTop: '0.75rem' }}>
                          <CyberCheckboxLabel>
                            <CyberCheckboxInput
                              type="checkbox"
                              checked={isCommentPrivate}
                              onChange={(e) => setIsCommentPrivate(e.target.checked)}
                            />
                            <span>🔒 Внутрішня нотатка (Тільки для персоналу)</span>
                          </CyberCheckboxLabel>
                        </div>
                      </FormGroup>
                      <Button $block type="submit" disabled={sendingComment || !newCommentText.trim()}>
                        <span>{sendingComment ? 'Надсилання...' : isCommentPrivate ? '🔒 Надіслати як внутрішню нотатку' : 'Надіслати коментар клієнту'}</span>
                      </Button>
                    </StyledForm>
                  )
                )}
              </Panel>
            </SideColumn>
          </Grid>
        )}
      </ContentWrapper>
      <Footer />
    </>
  )
}

// ── Styled Components ─────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  
  @media (min-width: 900px) {
    grid-template-columns: 1.4fr 1fr;
  }
`

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`

const SectionHeading = styled.h4`
  font-family: var(--theme-font-mono);
  font-size: 0.72rem;
  color: #00e5ff;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`

const ProblemImage = styled.img`
  max-width: 100%;
  border: 1px solid #0d2040;
  display: block;
  box-shadow: 0 0 15px rgba(0,229,255,0.05);
`

const ActionPanel = styled.div`
  background: #030a1c;
  border: 1px solid #0d2040;
  padding: 1.25rem;
  box-shadow: inset 0 0 20px rgba(0, 229, 255, 0.02);
`

const ActionGroup = styled.div`
  padding: 0.75rem 0;
  &:not(:last-child) {
    border-bottom: 1px dashed #0d2040;
    margin-bottom: 1rem;
  }
`

const StyledForm = styled.form`
  display: block;
`

const StyledSelect = styled.select`
  display: block;
  width: 100%;
  height: 44px;
  padding: 0.6rem 1rem;
  background: #030d1d;
  border: 1px solid #0d2040;
  border-left: 2px solid #00e5ff;
  color: #c9d1d9;
  font-family: var(--theme-font-mono);
  font-size: 0.85rem;
  outline: none;
  
  option {
    background: #030d1d;
    color: #c9d1d9;
  }
`

const CommentsList = styled.div`
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
`

const CommentCard = styled.div`
  background: ${({ $isPrivate }) => $isPrivate ? 'rgba(255, 59, 92, 0.03)' : '#040e21'};
  border-left: 2px solid ${({ $isPrivate }) => $isPrivate ? '#ff3b5c' : '#00e5ff'};
  border-top: 1px solid ${({ $isPrivate }) => $isPrivate ? 'rgba(255, 59, 92, 0.25)' : '#0d2040'};
  border-bottom: 1px solid ${({ $isPrivate }) => $isPrivate ? 'rgba(255, 59, 92, 0.25)' : '#0d2040'};
  border-right: 1px solid ${({ $isPrivate }) => $isPrivate ? 'rgba(255, 59, 92, 0.25)' : '#0d2040'};
  padding: 0.75rem;
  box-shadow: ${({ $isPrivate }) => $isPrivate ? '0 0 10px rgba(255, 59, 92, 0.05)' : 'none'};
`

const CyberCheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--theme-font-mono);
  font-size: 0.8rem;
  color: #ff3b5c;
  cursor: pointer;
  user-select: none;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255, 59, 92, 0.2);
  background: rgba(255, 59, 92, 0.02);
  border-radius: 4px;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: rgba(255, 59, 92, 0.05);
    border-color: #ff3b5c;
    box-shadow: 0 0 8px rgba(255, 59, 92, 0.15);
  }
`

const CyberCheckboxInput = styled.input`
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid #ff3b5c;
  background: transparent;
  cursor: pointer;
  position: relative;
  outline: none;
  border-radius: 2px;
  transition: all 0.2s;

  &:checked {
    background: #ff3b5c;
    box-shadow: 0 0 8px #ff3b5c;
  }

  &:checked::after {
    content: "✓";
    position: absolute;
    color: #030a1c;
    font-size: 10px;
    font-weight: bold;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
`

const CommentBody = styled.div`
  font-family: var(--theme-font-ui);
  font-size: 0.85rem;
  color: #c9d1d9;
  line-height: 1.4;
  white-space: pre-wrap;
`

const roleTranslations = {
  client: 'Клієнт',
  master: 'Майстер',
  manager: 'Менеджер',
  admin: 'Адміністратор',
}

const CommentRoleBadge = styled.span`
  display: inline-block;
  font-size: 0.58rem;
  padding: 0.1rem 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: var(--theme-font-mono);
  font-weight: bold;
  border: 1px solid;
  border-radius: 2px;
  line-height: 1;

  ${({ $role }) => {
    switch ($role) {
      case 'admin':
        return css`
          border-color: #00ff9d;
          color: #00ff9d;
          background: rgba(0, 255, 157, 0.05);
        `;
      case 'manager':
        return css`
          border-color: #d500f9;
          color: #d500f9;
          background: rgba(213, 0, 249, 0.05);
        `;
      case 'master':
        return css`
          border-color: #ff9d00;
          color: #ff9d00;
          background: rgba(255, 157, 0, 0.05);
        `;
      default:
        return css`
          border-color: #00e5ff;
          color: #00e5ff;
          background: rgba(0, 229, 255, 0.05);
        `;
    }
  }}
`

const CustomFileLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 44px;
  padding: 0.6rem 1rem;
  background: #030d1d;
  border: 1px dashed #0d2040;
  border-left: 2px solid #00e5ff;
  color: #8b9eb0;
  font-family: var(--theme-font-mono);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  
  &:hover {
    background: #041226;
    border-color: #00e5ff;
    color: #00e5ff;
  }
  
  &:active {
    background: #020917;
  }

  ${({ $hasFile }) => $hasFile && css`
    border-style: solid;
    border-color: #00ff9d;
    color: #00ff9d;
    background: rgba(0, 255, 157, 0.02);
  `}
`
