import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFoundPage() {
  return (
    <>
      <Navbar />
      <Wrapper>
        <Panel>
          <ErrorCode>404</ErrorCode>
          <ErrorLabel>System Error // Page Not Found</ErrorLabel>
          <ErrorDesc>
            Сторінку не знайдено. Можливо, вона була видалена або ніколи не існувала.
          </ErrorDesc>
          <StatusBar>
            <StatusDot />
            З'єднання розірвано — маршрут не знайдено
          </StatusBar>
          <Actions>
            <HomeLink to="/">На головну</HomeLink>
          </Actions>
        </Panel>
      </Wrapper>
      <Footer />
    </>
  )
}

const glitch = keyframes`
  0%, 100% { text-shadow: 2px 0 #00e5ff, -2px 0 #ff3b5c; }
  25%      { text-shadow: -2px 0 #00e5ff, 2px 0 #ff3b5c; }
  50%      { text-shadow: 1px 1px #00e5ff, -1px -1px #ff3b5c; }
  75%      { text-shadow: -1px -1px #00e5ff, 1px 1px #ff3b5c; }
`

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
`

const Wrapper = styled.div`
  padding-top: 52px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
`

const Panel = styled.div`
  text-align: center;
  max-width: 520px;
  width: 100%;
  padding: 3rem 2rem;
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.red} 0%,
      transparent 40%,
      transparent 60%,
      ${({ theme }) => theme.colors.red} 100%
    );
    clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
    z-index: -1;
    opacity: 0.2;
  }
`

const ErrorCode = styled.h1`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 400;
  color: ${({ theme }) => theme.colors.red};
  letter-spacing: 0.15em;
  animation: ${glitch} 3s ease-in-out infinite;
  margin-bottom: 0.5rem;
  line-height: 1;
`

const ErrorLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.cyanDim};
  margin-bottom: 1.5rem;
`

const ErrorDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 1.5rem;
`

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.4rem 0.75rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border-left: 2px solid ${({ theme }) => theme.colors.red};
  margin-bottom: 1.5rem;
`

const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.red};
  box-shadow: 0 0 8px ${({ theme }) => theme.colors.red};
  animation: ${blink} 1.5s ease-in-out infinite;
  flex-shrink: 0;
  display: inline-block;
`

const Actions = styled.div`
  display: flex;
  justify-content: center;
`

const HomeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.cyan};
  color: ${({ theme }) => theme.colors.cyan};
  background: transparent;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  transition: background 0.25s, color 0.25s, box-shadow 0.25s;

  &:hover {
    background: ${({ theme }) => theme.colors.cyan};
    color: ${({ theme }) => theme.colors.bgDeep};
    box-shadow: 0 0 20px rgba(0,229,255,0.3);
  }
`
