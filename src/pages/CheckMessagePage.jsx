import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styled, { css } from 'styled-components'
import {
  ContentWrapper, SectionTitle, Panel, Card, CardTitle, CardBody,
  CardMeta, StatusBadge, Pre, Spinner, Alert, Button, Mono, PanelCorners,
  FormGroup, FormLabel, Textarea, PanelTitle, PanelSubtitle, RowActions, Input
} from '../components/ui'
import { getMessage, markAnswerRead, addAnswer, acceptPrice, declinePrice, negotiatePrice, markPaid, confirmHandover, refineBargain } from '../api/client'

export default function CheckMessagePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  // Negotiation states
  const [showNegotiateForm, setShowNegotiateForm] = useState(false)
  const [counterPriceValue, setCounterPriceValue] = useState('')
  const [negotiateComment, setNegotiateComment] = useState('')

  const handleNegotiatePriceSubmit = async (e) => {
    e.preventDefault()
    if (!counterPriceValue || !negotiateComment.trim()) {
      setError('Вкажіть суму та коментар для торгу')
      return
    }
    setError('')
    setSubmittingAction(true)
    try {
      await negotiatePrice(id, parseInt(counterPriceValue, 10), negotiateComment)
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
      setShowNegotiateForm(false)
      setCounterPriceValue('')
      setNegotiateComment('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося надіслати пропозицію торгу')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleAcceptPrice = async () => {
    setError('')
    setSubmittingAction(true)
    try {
      await acceptPrice(id)
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося прийняти ціну')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleDeclinePrice = async () => {
    if (!window.confirm('Ви дійсно хочете відхилити запропоновану ціну? Ваша заявка буде закрита (відхилена).')) return
    setError('')
    setSubmittingAction(true)
    try {
      await declinePrice(id)
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося відхилити ціну')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleMarkPaid = async () => {
    setError('')
    setSubmittingAction(true)
    try {
      await markPaid(id)
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося позначити як оплачено')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleConfirmHandover = async () => {
    if (!window.confirm('Ви дійсно підтверджуєте отримання свого пристрою та закриття заявки?')) return
    setError('')
    setSubmittingAction(true)
    try {
      await confirmHandover(id)
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося підтвердити отримання пристрою')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleAiRefineBargain = async () => {
    if (!counterPriceValue || !negotiateComment.trim()) {
      setError('Вкажіть зустрічну ціну та аргументи перед покращенням коментаря!')
      return
    }
    setError('')
    setAiLoading(true)
    try {
      const res = await refineBargain(data.problem.proposed_price, parseInt(counterPriceValue, 10), negotiateComment)
      if (res.data && res.data.refined_text) {
        setNegotiateComment(res.data.refined_text)
      }
    } catch (err) {
      setError('Не вдалося зв’язатися з ШІ для ввічливого торгу.')
    } finally {
      setAiLoading(false)
    }
  }

  // Fetch problem and answers
  useEffect(() => {
    getMessage(id)
      .then(({ data }) => setData(data))
      .catch(() => setError('Не вдалося завантажити відповіді'))
      .finally(() => setLoading(false))
  }, [id])

  // Mark all staff answers as read when component loads (if any unread staff comments)
  const markedReadRef = useRef(new Set())

  useEffect(() => {
    if (data?.answers && id) {
      const hasUnread = data.answers.some((a) => !a.is_read && a.admin_role !== 'client')
      if (hasUnread && !markedReadRef.current.has(id)) {
        markedReadRef.current.add(id)
        markAnswerRead(id).catch(() => {})
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            answers: prev.answers.map((a) =>
              a.admin_role !== 'client' ? { ...a, is_read: true } : a
            )
          }
        })
      }
    }
  }, [data, id])

  const [newCommentText, setNewCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return
    setError('')
    setSendingComment(true)
    try {
      await addAnswer(id, newCommentText)
      setNewCommentText('')
      // Refetch comments
      const { data: refreshedData } = await getMessage(id)
      setData(refreshedData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Не вдалося надіслати коментар')
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Деталі заявки та коментарі</SectionTitle>

        {loading && <Spinner />}
        {error && <Alert $type="error"><span>&#x26A0;</span><span>{error}</span></Alert>}

        {data && (
          <Grid>
            <MainColumn>
              <Panel $wide>
                <PanelCorners />
                <DetailHeader>
                  <CardTitle style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    {data.problem.title}
                  </CardTitle>
                  <StatusBadge $status={data.problem.status}>{data.problem.status}</StatusBadge>
                </DetailHeader>

                <CardMeta style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  Створено: {new Date(data.problem.date_created).toLocaleString('uk-UA')}
                  {data.problem.assignee_name && (
                    <span style={{ color: '#00e5ff', marginLeft: '1rem' }}>
                      [Майстер: {data.problem.assignee_name}]
                    </span>
                  )}
                </CardMeta>

                {data.problem.proposed_price !== null && data.problem.proposed_price !== undefined && (
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
                          {data.problem.proposed_price} грн
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#8b9eb0' }}>
                          ({data.problem.price_status === 'accepted' ? 'Прийнята вами' : data.problem.price_status === 'negotiating' ? 'Контр-пропозиція (торг)' : data.problem.price_status === 'proposed' ? 'Запропонована менеджером' : 'В процесі узгодження'})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <SectionHeading>Опис проблеми</SectionHeading>
                <CardBody style={{ whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
                  {data.problem.description}
                </CardBody>

                {data.problem.image_url && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <SectionHeading>Прикріплене зображення</SectionHeading>
                    <ProblemImage
                      src={`/static/${data.problem.image_url}`}
                      alt="Вигляд проблеми"
                    />
                  </div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                  <Button as={Link} to="/requests">
                    <span>← До списку заявок</span>
                  </Button>
                  {data.problem.status === 'Завершено' && (
                    <Button as={Link} to={`/service-record/${data.problem.id}`} $variant="green">
                      <span>Отримати гарантійний талон</span>
                    </Button>
                  )}
                </div>
              </Panel>

              {/* WORKFLOW STATUS PANEL */}
              {data.problem.status === 'Приймання ціни' && (
                <Panel $wide style={{ borderColor: '#ff9d00', background: 'rgba(255, 157, 0, 0.02)' }}>
                  <PanelCorners />
                  <PanelTitle $sm style={{ color: '#ff9d00' }}>💰 Узгодження вартості ремонту</PanelTitle>
                  <PanelSubtitle>Етап узгодження кінцевої ціни перед початком робіт</PanelSubtitle>
                  
                  {data.problem.proposed_price ? (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', color: '#c9d1d9', marginBottom: '1rem' }}>
                        {data.problem.price_status === 'negotiating' ? (
                          <span>Ваша пропозиція торгу: <span style={{ color: '#00ff9d', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.problem.proposed_price} грн</span> (очікує на відповідь менеджера)</span>
                        ) : (
                          <span>Менеджер запропонував вартість робіт: <span style={{ color: '#00ff9d', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.problem.proposed_price} грн</span></span>
                        )}
                      </p>
                      
                      {data.problem.price_status === 'negotiating' ? (
                        <Alert $type="info" style={{ marginBottom: '1.25rem' }}>
                          <span>⏳</span>
                          <span>Ви запропонували торг. Менеджер розглядає вашу пропозицію або готує нову ціну. Ви можете додатково обговорити деталі в чаті справа.</span>
                        </Alert>
                      ) : (
                        <>
                          <Alert $type="info" style={{ marginBottom: '1.25rem' }}>
                            <span>ℹ</span>
                            <span>Якщо ви погоджуєтеся з ціною, майстер негайно приступає до ремонту. Якщо ви бажаєте запропонувати свою ціну, натисніть "Торгуватися".</span>
                          </Alert>
                          <RowActions style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Button $variant="green" onClick={handleAcceptPrice} disabled={submittingAction}>
                              <span>{submittingAction ? 'Прийняття...' : '✓ Погодитись на ціну'}</span>
                            </Button>
                            <Button $variant="cyan" onClick={() => setShowNegotiateForm(!showNegotiateForm)} disabled={submittingAction}>
                              <span>🤝 Торгуватися</span>
                            </Button>
                            <Button $variant="red" onClick={handleDeclinePrice} disabled={submittingAction}>
                              <span>{submittingAction ? 'Відхилення...' : '❌ Відхилити та закрити'}</span>
                            </Button>
                          </RowActions>
                        </>
                      )}

                      {showNegotiateForm && (
                        <form onSubmit={handleNegotiatePriceSubmit} style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 157, 0, 0.15)', paddingTop: '1.5rem' }}>
                          <FormGroup style={{ maxWidth: '300px' }}>
                            <FormLabel htmlFor="counterPriceInput">Ваша пропозиція вартості (грн)</FormLabel>
                            <Input
                              id="counterPriceInput"
                              type="number"
                              placeholder="Наприклад: 1000"
                              value={counterPriceValue}
                              onChange={(e) => setCounterPriceValue(e.target.value)}
                              required
                            />
                          </FormGroup>
                          <FormGroup>
                            <FormLabel htmlFor="negotiateCommentInput">Ваш коментар / побажання</FormLabel>
                            <Textarea
                              id="negotiateCommentInput"
                              placeholder="Опишіть ваші побажання або чому ви пропонуєте таку вартість..."
                              value={negotiateComment}
                              onChange={(e) => setNegotiateComment(e.target.value)}
                              rows={3}
                              required
                            />
                          </FormGroup>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                            <Button
                              type="button"
                              $variant="cyan"
                              style={{ height: '34px', padding: '0 1rem', fontSize: '0.72rem' }}
                              disabled={aiLoading || !counterPriceValue || !negotiateComment.trim()}
                              onClick={handleAiRefineBargain}
                            >
                              <span>{aiLoading ? '✨ Оптимізація...' : '✨ Сформулювати ввічливо через ШІ'}</span>
                            </Button>
                          </div>
                          <RowActions style={{ marginTop: '1rem' }}>
                            <Button $variant="green" type="submit" disabled={submittingAction}>
                              <span>{submittingAction ? 'Надсилання...' : 'Надіслати пропозицію'}</span>
                            </Button>
                            <Button $variant="secondary" type="button" onClick={() => setShowNegotiateForm(false)}>
                              <span>Скасувати</span>
                            </Button>
                          </RowActions>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem' }}>
                      <Alert $type="info" style={{ marginBottom: 0 }}>
                        <span>⏳</span>
                        <span>Ми оцінюємо несправність та обговорюємо деталі. Щойно менеджер запропонує вартість ремонту, ви зможете затвердити її тут. Ви можете залишати свої коментарі та запитання в чаті справа.</span>
                      </Alert>
                    </div>
                  )}
                </Panel>
              )}

              {data.problem.status === 'Прийняття оплати' && (
                <Panel $wide style={{ borderColor: '#d500f9', background: 'rgba(213, 0, 249, 0.02)' }}>
                  <PanelCorners />
                  <PanelTitle $sm style={{ color: '#d500f9' }}>💳 Оплата виконаних робіт</PanelTitle>
                  <PanelSubtitle>Ремонт завершено! Будь ласка, здійсніть оплату за реквізитами</PanelSubtitle>

                  <div style={{ marginTop: '1rem', marginBottom: '1.5rem', background: 'rgba(0, 255, 157, 0.05)', padding: '0.85rem 1.25rem', borderLeft: '3px solid #00ff9d', borderRadius: '2px' }}>
                    <p style={{ fontSize: '0.95rem', color: '#c9d1d9', margin: 0, fontFamily: 'var(--theme-font-ui)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>Сума до сплати (узгоджена вартість):</span>
                      <strong style={{ color: '#00ff9d', fontSize: '1.25rem', fontFamily: 'var(--theme-font-mono)' }}>{data.problem.proposed_price || 0} грн</strong>
                    </p>
                  </div>

                  {data.problem.completion_work_done && (
                    <div style={{ marginTop: '1rem', background: '#0a1526', padding: '1rem', border: '1px solid #0d2040', borderRadius: '4px', marginBottom: '1.5rem' }}>
                      <h5 style={{ color: '#00e5ff', fontSize: '0.8rem', fontFamily: 'var(--theme-font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem', marginTop: 0 }}>Звіт про виконаний ремонт:</h5>
                      <p style={{ fontSize: '0.85rem', color: '#c9d1d9', margin: '0 0 0.5rem 0' }}>
                        <strong>Виконані роботи:</strong> <span dangerouslySetInnerHTML={{ __html: data.problem.completion_work_done }} />
                      </p>
                      {data.problem.completion_parts_used && (
                        <p style={{ fontSize: '0.85rem', color: '#c9d1d9', margin: 0 }}>
                          <strong>Використані запчастини:</strong> <span dangerouslySetInnerHTML={{ __html: data.problem.completion_parts_used }} />
                        </p>
                      )}
                    </div>
                  )}

                  {data.problem.payment_requisites ? (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', color: '#c9d1d9', marginBottom: '0.75rem' }}>
                        Будь ласка, сплатіть <strong style={{ color: '#00ff9d' }}>{data.problem.proposed_price || 0} грн</strong> за вказаними нижче реквізитами:
                      </p>
                      <h5 style={{ color: '#00e5ff', fontSize: '0.8rem', fontFamily: 'var(--theme-font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Реквізити для оплати:</h5>
                      <Pre style={{ background: '#030a1c', border: '1px solid #0d2040', padding: '0.75rem', fontSize: '0.85rem', color: '#c9d1d9', marginBottom: '1.25rem' }}>
                        {data.problem.payment_requisites}
                      </Pre>

                      {data.problem.payment_invoice_url && (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <Button as="a" href={`/static/${data.problem.payment_invoice_url}`} target="_blank" rel="noopener noreferrer" $variant="cyan" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span>📄 Завантажити рахунок-фактуру</span>
                          </Button>
                        </div>
                      )}

                      {!data.problem.payment_client_marked ? (
                        <div style={{ marginTop: '1rem' }}>
                          <Alert $type="info" style={{ marginBottom: '1rem' }}>
                            <span>ℹ</span>
                            <span>Після проведення оплати обов'язково натисніть кнопку нижче, щоб сповістити менеджера для підтвердження платежу.</span>
                          </Alert>
                          <Button $variant="green" onClick={handleMarkPaid} disabled={submittingAction}>
                            <span>{submittingAction ? 'Надсилання...' : '✓ Позначити як оплачено'}</span>
                          </Button>
                        </div>
                      ) : (
                        <Alert $type="success" style={{ marginTop: '1rem', marginBottom: 0 }}>
                          <span>✓</span>
                          <span>Ви позначили цю заявку як оплачену. Менеджер перевірить надходження коштів та підтвердить завершення замовлення.</span>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem' }}>
                      <Alert $type="info" style={{ marginBottom: 0 }}>
                        <span>⏳</span>
                        <span>Менеджер готує рахунок та платіжні реквізити на суму <strong style={{ color: '#00ff9d' }}>{data.problem.proposed_price || 0} грн</strong>. Зачекайте, будь ласка, вони з'являться на цій сторінці найближчим часом.</span>
                      </Alert>
                    </div>
                  )}
                </Panel>
              )}

              {data.problem.status === 'Готово до видачі' && (
                <Panel $wide style={{ borderColor: '#00ff9d', background: 'rgba(0, 255, 157, 0.02)' }}>
                  <PanelCorners />
                  <PanelTitle $sm style={{ color: '#00ff9d' }}>🎉 Готово до видачі</PanelTitle>
                  <PanelSubtitle>Ваш пристрій відремонтовано та успішно оплачено! Заберіть його у сервісному центрі.</PanelSubtitle>
                  
                  <div style={{ marginTop: '1rem', background: '#0a1526', padding: '1rem', border: '1px solid #0d2040', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    <h5 style={{ color: '#00e5ff', fontSize: '0.8rem', fontFamily: 'var(--theme-font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem', marginTop: 0 }}>Звіт про виконаний ремонт:</h5>
                    <p style={{ fontSize: '0.85rem', color: '#c9d1d9', margin: '0 0 0.5rem 0' }}>
                      <strong>Виконані роботи:</strong> <span dangerouslySetInnerHTML={{ __html: data.problem.completion_work_done || 'Комплексне сервісне обслуговування' }} />
                    </p>
                    {data.problem.completion_parts_used && (
                      <p style={{ fontSize: '0.85rem', color: '#c9d1d9', margin: 0 }}>
                        <strong>Використані запчастини:</strong> <span dangerouslySetInnerHTML={{ __html: data.problem.completion_parts_used }} />
                      </p>
                    )}
                  </div>

                  <Alert $type="info" style={{ marginBottom: '1.5rem' }}>
                    <span>ℹ</span>
                    <span>Коли заберете пристрій у нашого менеджера, натисніть кнопку нижче для остаточного підтвердження отримання та активації вашої гарантії.</span>
                  </Alert>

                  <Button $variant="green" onClick={handleConfirmHandover} disabled={submittingAction}>
                    <span>{submittingAction ? 'Підтвердження...' : '✓ Забрав пристрій (Підтвердити отримання)'}</span>
                  </Button>
                </Panel>
              )}

              {data.problem.status === 'Завершено' && (
                <Panel $wide style={{ borderColor: '#00ff9d', background: 'rgba(0, 255, 157, 0.02)' }}>
                  <PanelCorners />
                  <PanelTitle $sm style={{ color: '#00ff9d' }}>🎉 Ремонт Успішно Завершено!</PanelTitle>
                  <PanelSubtitle>Дякуємо, що обрали наш сервісний центр!</PanelSubtitle>
                  <div style={{ marginTop: '1rem', color: '#c9d1d9', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <p><strong>Ви — просто неймовірний клієнт, ви справжній молодець!</strong> Нашій компанії дуже сподобалося співпрацювати з вами. Ваша оперативність, довіра та вчасна оплата — це найкраща нагорода для всієї нашої команди. З великим задоволенням чекатимемо на вас знову у разі потреби! ❤️</p>
                    <p style={{ marginTop: '0.5rem' }}>Ваш пристрій повністю відремонтований, протестований та готовий до тривалої надійної служби. Ми впевнені, що ви будете повністю задоволені результатом!</p>
                  </div>
                  <Alert $type="success" style={{ marginTop: '1rem', marginBottom: 0 }}>
                    <span>✨</span>
                    <span>Гарантійний талон активовано. Ви можете завантажити його за кнопкою в основній картці замовлення. Бажаємо гарного дня та чудового користування пристроєм!</span>
                  </Alert>
                </Panel>
              )}
            </MainColumn>

            <SideColumn>
              <Panel $compact>
                <PanelCorners />
                <PanelTitle $sm>💬 Публічне обговорення</PanelTitle>
                <PanelSubtitle>Міні-чат для зв'язку зі спеціалістами сервісного центру</PanelSubtitle>
                
                <CommentsList>
                  {data.answers && data.answers.filter(ans => !ans.is_private).length > 0 ? (
                    (() => {
                      const seen = new Set();
                      return data.answers
                        .filter(ans => !ans.is_private)
                        .filter(ans => {
                          if (ans.id && seen.has(ans.id)) return false;
                          if (ans.id) seen.add(ans.id);
                          return true;
                        })
                        .map((answer, idx) => (
                          <CommentCard key={answer.id || idx}>
                            <CommentHeader>
                              <Mono style={{ color: '#00e5ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span>{answer.admin_name || 'Співробітник'}</span>
                                <CommentRoleBadge $role={answer.admin_role || 'client'}>
                                  {roleTranslations[answer.admin_role] || 'Клієнт'}
                                </CommentRoleBadge>
                              </Mono>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <Mono $muted $size="0.65rem">
                                  {new Date(answer.date_responded).toLocaleString('uk-UA')}
                                </Mono>
                                <Mono $size="0.65rem" style={{ color: answer.is_read ? '#00a862' : '#ff3b5c' }}>
                                  {answer.is_read ? '✓ Прочитано' : '✉ Не прочитано'}
                                </Mono>
                              </div>
                            </CommentHeader>
                            <CommentBody dangerouslySetInnerHTML={{ __html: answer.message }} />
                          </CommentCard>
                        ));
                    })()
                  ) : (
                    <div style={{ padding: '1rem 0', color: '#5a7a9a', fontFamily: 'var(--theme-font-mono)', fontSize: '0.8rem' }}>
                      Коментарів поки немає. Співробітники сервісу незабаром нададуть відповідь!
                    </div>
                  )}
                </CommentsList>

                {/* Add comment form if not Completed or Declined */}
                {['Завершено', 'Відхилено'].includes(data.problem.status) ? (
                  <Alert $type="info" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                    <span>🔒</span>
                    <span>Обговорення цієї заявки закрито, оскільки вона має статус "{data.problem.status}".</span>
                  </Alert>
                ) : (
                  <form onSubmit={handleSendComment} style={{ marginTop: '1.5rem', borderTop: '1px solid #0d2040', paddingTop: '1rem' }}>
                    <FormGroup style={{ marginBottom: '1rem' }}>
                      <FormLabel htmlFor="newComment">Додати коментар</FormLabel>
                      <Textarea
                        id="newComment"
                        placeholder="Напишіть повідомлення для служби підтримки..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        rows={3}
                        required
                      />
                    </FormGroup>
                    <Button $block type="submit" disabled={sendingComment || !newCommentText.trim()}>
                      <span>{sendingComment ? 'Надсилання...' : 'Надіслати коментар'}</span>
                    </Button>
                  </form>
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

// ── Styled Components for Chat ────────────────────────────
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
  background: #040e21;
  border-left: 2px solid #00e5ff;
  border-top: 1px solid #0d2040;
  border-bottom: 1px solid #0d2040;
  border-right: 1px solid #0d2040;
  padding: 0.75rem;
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
