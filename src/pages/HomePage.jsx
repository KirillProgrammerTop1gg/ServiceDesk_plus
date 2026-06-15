import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <>
      <Navbar />
      <IndexWrapper>
        <Hero>
          <HeroTag>Smart Service Platform • Online Support</HeroTag>

          <HeroTitle>
            Онлайн система
            <HeroAccent>ремонту техніки</HeroAccent>
          </HeroTitle>

          <HeroDesc>
            Подавайте заявки на ремонт техніки онлайн, додавайте фотографії
            несправностей, відстежуйте статус ремонту та отримуйте підтвердження
            виконаних робіт у декілька кліків.
          </HeroDesc>

          <HeroActions>
            {user ? (
              <>
                <HeroBtnPrimary to="/requests/new">+ Створити заявку</HeroBtnPrimary>
                <HeroBtnSecondary to="/requests">Переглянути статус</HeroBtnSecondary>
              </>
            ) : (
              <>
                <HeroBtnPrimary to="/register">Створити акаунт</HeroBtnPrimary>
                <HeroBtnSecondary to="/login">Увійти в систему</HeroBtnSecondary>
              </>
            )}
          </HeroActions>

          <Stats>
            <StatCell>
              <StatValue>24/7</StatValue>
              <StatLabel>Прийом заявок</StatLabel>
            </StatCell>
            <StatCell>
              <StatValue>3</StatValue>
              <StatLabel>Статуси ремонту</StatLabel>
            </StatCell>
            <StatCell>
              <StatValue>TG</StatValue>
              <StatLabel>Telegram бот</StatLabel>
            </StatCell>
          </Stats>

          <SectionDivider />

          <SectionTag>Переваги сервісу</SectionTag>
          <SectionTitle>Чому обирають TechFix?</SectionTitle>

          <Advantages>
            <AdvCard>
              <AdvIcon>&#9889;</AdvIcon>
              <AdvTitle>Швидка обробка</AdvTitle>
              <AdvText>
                Заявки обробляються моментально після подання.
                Статус ремонту оновлюється в реальному часі —
                ви завжди знаєте, на якому етапі ваша техніка.
              </AdvText>
            </AdvCard>

            <AdvCard>
              <AdvIcon>&#128247;</AdvIcon>
              <AdvTitle>Фото-звіти</AdvTitle>
              <AdvText>
                Завантажуйте фотографії несправностей при поданні заявки.
                Адміністратори бачать проблему одразу, що пришвидшує
                діагностику та ремонт.
              </AdvText>
            </AdvCard>

            <AdvCard>
              <AdvIcon>&#128274;</AdvIcon>
              <AdvTitle>Гарантія якості</AdvTitle>
              <AdvText>
                Після завершення ремонту ви отримуєте талон обслуговування
                з описом робіт, використаними матеріалами та гарантійною
                інформацією.
              </AdvText>
            </AdvCard>

            <AdvCard>
              <AdvIcon>&#128172;</AdvIcon>
              <AdvTitle>Пряма комунікація</AdvTitle>
              <AdvText>
                Спілкуйтеся з адміністраторами напряму через систему.
                Отримуйте відповіді, уточнення та повідомлення
                про статус ремонту без затримок.
              </AdvText>
            </AdvCard>

            <AdvCard>
              <AdvIcon>&#128241;</AdvIcon>
              <AdvTitle>Telegram інтеграція</AdvTitle>
              <AdvText>
                Перевіряйте статус заявок через Telegram-бот —
                швидкий доступ до інформації без входу в систему.
                Зручно та завжди під рукою.
              </AdvText>
            </AdvCard>

            <AdvCard>
              <AdvIcon>&#128736;</AdvIcon>
              <AdvTitle>Повний контроль</AdvTitle>
              <AdvText>
                Відстежуйте кожен етап: «чекає на обробку», «в обробці»,
                «завершено». Історія заявок та документів завжди доступна
                у вашому кабінеті.
              </AdvText>
            </AdvCard>
          </Advantages>

          <SectionDivider />

          <SectionTag>Як це працює</SectionTag>
          <SectionTitle>Процес ремонту за 3 кроки</SectionTitle>

          <Steps>
            <Step>
              <StepNumber>01</StepNumber>
              <StepTitle>Подайте заявку</StepTitle>
              <StepText>
                Заповніть форму: опишіть проблему, додайте фотографії.
                Заявка миттєво надходить до адміністраторів.
              </StepText>
            </Step>

            <StepLine />

            <Step>
              <StepNumber>02</StepNumber>
              <StepTitle>Отримайте відповідь</StepTitle>
              <StepText>
                Адміністратор переглядає заявку, зв'язується з вами
                та бере ремонт у роботу. Статус оновлюється автоматично.
              </StepText>
            </Step>

            <StepLine />

            <Step>
              <StepNumber>03</StepNumber>
              <StepTitle>Забирайте готову техніку</StepTitle>
              <StepText>
                Після завершення ремонту ви отримуєте талон обслуговування
                з повним описом робіт та гарантією.
              </StepText>
            </Step>
          </Steps>

          <SectionDivider />

          <FeatureGrid>
            <FeatureCard>
              <FeatureTitle>Для клієнтів</FeatureTitle>
              <FeatureText>
                Створення заявок на ремонт, завантаження фотографій проблеми,
                відстеження статусу:{' '}
                <FeatureAccent>
                  "чекає на обробку", "в обробці", "завершений".
                </FeatureAccent>
              </FeatureText>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>Для адміністраторів</FeatureTitle>
              <FeatureText>
                Обробка заявок користувачів, відповіді клієнтам, контроль
                ремонту та надсилання талонів про виконані технічні послуги.
              </FeatureText>
            </FeatureCard>

            <FeatureCard>
              <FeatureTitle>Розширений функціонал</FeatureTitle>
              <FeatureText>
                Нотатки майстрів, нагадування про важливі події, зберігання
                гарантійних документів, а також окремий доступ для постачальників.
              </FeatureText>
            </FeatureCard>
          </FeatureGrid>

          <TgBanner>
            <TgLabel>Telegram інтеграція</TgLabel>
            <FeatureText style={{ margin: 0 }}>
              Користувачі можуть перевіряти статус своїх заявок не лише на
              сайті, а й через Telegram-бота для швидкого доступу до інформації
              про ремонт.
            </FeatureText>
          </TgBanner>

          <CtaSection>
            <CtaTitle>Готові подати заявку?</CtaTitle>
            <CtaDesc>
              Створіть акаунт або увійдіть у систему, щоб розпочати роботу
              з сервісом ремонту техніки.
            </CtaDesc>
            <HeroActions>
              {user ? (
                <>
                  <HeroBtnPrimary to="/requests/new">+ Створити заявку</HeroBtnPrimary>
                  <HeroBtnSecondary to="/requests">Мої заявки</HeroBtnSecondary>
                </>
              ) : (
                <>
                  <HeroBtnPrimary to="/register">Створити акаунт</HeroBtnPrimary>
                  <HeroBtnSecondary to="/login">Увійти в систему</HeroBtnSecondary>
                </>
              )}
            </HeroActions>
          </CtaSection>
        </Hero>
      </IndexWrapper>
      <Footer />
    </>
  )
}

// ── Styles ─────────────────────────────────────────────────
const IndexWrapper = styled.div`
  padding-top: 52px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
`

const Hero = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  max-width: 1100px;
  width: 100%;
`

const HeroTag = styled.p`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.greenDim};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &::before, &::after {
    content: '';
    display: inline-block;
    width: 40px;
    height: 1px;
    background: ${({ theme }) => theme.colors.greenDim};
  }
`

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 0.5rem;
`

const HeroAccent = styled.span`
  color: ${({ theme }) => theme.colors.cyan};
  text-shadow: 0 0 30px rgba(0,229,255,0.5);
  display: block;
`

const HeroDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 480px;
  margin: 1.5rem auto 2.5rem;
  line-height: 1.7;
`

const HeroActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const heroBtn = `
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.25s;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
`

const HeroBtnPrimary = styled(Link)`
  ${heroBtn}
  background: ${({ theme }) => theme.colors.cyan};
  border-color: ${({ theme }) => theme.colors.cyan};
  color: ${({ theme }) => theme.colors.bgDeep};
  font-weight: 600;

  &:hover {
    background: transparent;
    color: ${({ theme }) => theme.colors.cyan};
    box-shadow: 0 0 20px rgba(0,229,255,0.3);
  }
`

const HeroBtnSecondary = styled(Link)`
  ${heroBtn}
  background: transparent;
  border-color: ${({ theme }) => theme.colors.textMuted};
  color: ${({ theme }) => theme.colors.textSecondary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    color: ${({ theme }) => theme.colors.cyanDim};
  }
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  max-width: 600px;
  margin: 4rem auto 0;
  background: ${({ theme }) => theme.colors.border};
`

const StatCell = styled.div`
  background: ${({ theme }) => theme.colors.bgPanel};
  padding: 1.5rem 1rem;
  text-align: center;
`

const StatValue = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.cyan};
  text-shadow: 0 0 20px rgba(0,229,255,0.3);
  display: block;
`

const StatLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 0.25rem;
  display: block;
`

const SectionDivider = styled.div`
  margin: 4rem auto;
  max-width: 200px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.borderGlow}, transparent);
`

const SectionTag = styled.p`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.greenDim};
  margin-bottom: 0.75rem;
`

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: clamp(1.3rem, 3vw, 2rem);
  font-weight: 400;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 2.5rem;
`

const Advantages = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  text-align: left;
`

const AdvCard = styled.div`
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.75rem 1.5rem;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  transition: border-color 0.25s, background 0.25s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    background: rgba(0,229,255,0.02);
  }
`

const AdvIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`

const AdvTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  color: ${({ theme }) => theme.colors.cyan};
  text-transform: uppercase;
  margin-bottom: 0.75rem;
`

const AdvText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`

const Steps = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  text-align: left;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`

const Step = styled.div`
  flex: 1;
  min-width: 220px;
  max-width: 320px;
  padding: 0 1.5rem;
`

const StepNumber = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2.5rem;
  color: ${({ theme }) => theme.colors.cyan};
  text-shadow: 0 0 20px rgba(0,229,255,0.3);
  line-height: 1;
  margin-bottom: 0.75rem;
`

const StepTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`

const StepText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`

const StepLine = styled.div`
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.borderGlow}, ${({ theme }) => theme.colors.cyanDim});
  margin-top: 1.5rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 1px;
    height: 40px;
    background: linear-gradient(180deg, ${({ theme }) => theme.colors.borderGlow}, ${({ theme }) => theme.colors.cyanDim});
    margin: 1.5rem auto;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  text-align: left;
`

const FeatureCard = styled.div`
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.5rem;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
`

const FeatureTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  color: ${({ theme }) => theme.colors.cyan};
  text-transform: uppercase;
  margin-bottom: 0.75rem;
`

const FeatureText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`

const FeatureAccent = styled.span`
  color: ${({ theme }) => theme.colors.cyan};
`

const TgBanner = styled.div`
  margin-top: 3rem;
  padding: 1rem 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 229, 255, 0.03);
  text-align: left;
`

const TgLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  color: ${({ theme }) => theme.colors.green};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-size: 0.72rem;
  margin-bottom: 0.75rem;
`

const CtaSection = styled.div`
  margin-top: 4rem;
  padding: 3rem 2rem;
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
`

const CtaTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1.3rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 0.75rem;
`

const CtaDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2rem;
  line-height: 1.6;
`
