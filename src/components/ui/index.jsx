import styled, { css, keyframes } from 'styled-components'

// ── Animations ────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`
const scanline = keyframes`
  0%   { opacity: 0.3; }
  50%  { opacity: 1; }
  100% { opacity: 0.3; }
`
const spin = keyframes`to { transform: rotate(360deg); }`

// ── Page Wrappers ─────────────────────────────────────────
export const PageWrapper = styled.div`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72px 2rem 2rem;
`;

export const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 72px 2rem 2rem;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
`

// ── Panel ─────────────────────────────────────────────────
export const Panel = styled.div`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '720px' : '440px')};
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
  padding: ${({ $compact }) => ($compact ? '1.5rem' : '2.5rem 2rem')};

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.cyan} 0%,
      transparent 40%,
      transparent 60%,
      ${({ theme }) => theme.colors.cyan} 100%
    );
    clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
    z-index: -1;
    opacity: 0.25;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.cyan}, transparent);
    animation: ${scanline} 3s linear infinite;
  }
`

// Corner decorations as a compound component
export function PanelCorners() {
  return (
    <>
      <Corner $pos="tl" />
      <Corner $pos="tr" />
      <Corner $pos="bl" />
      <Corner $pos="br" />
    </>
  )
}

const Corner = styled.div`
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: ${({ theme }) => theme.colors.cyan};
  border-style: solid;
  opacity: 0.6;

  ${({ $pos }) => $pos === 'tl' && css`top: 8px; left: 8px; border-width: 2px 0 0 2px;`}
  ${({ $pos }) => $pos === 'tr' && css`top: 8px; right: 8px; border-width: 2px 2px 0 0;`}
  ${({ $pos }) => $pos === 'bl' && css`bottom: 8px; left: 8px; border-width: 0 0 2px 2px;`}
  ${({ $pos }) => $pos === 'br' && css`bottom: 8px; right: 8px; border-width: 0 2px 2px 0;`}
`

// ── Panel Header ──────────────────────────────────────────
export const PanelHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

export const LogoIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid ${({ theme }) => theme.colors.cyanDim};
  background: ${({ theme }) => theme.colors.cyanGlow};
  margin-bottom: 1rem;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  font-size: 22px;
  color: ${({ theme }) => theme.colors.cyan};
`

export const PanelTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ $sm }) => ($sm ? '0.9rem' : '1.4rem')};
  letter-spacing: 0.2em;
  color: ${({ theme }) => theme.colors.cyan};
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(0,229,255,0.5);
`

export const PanelSubtitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 0.25rem;
`

// ── Status Bar ────────────────────────────────────────────
export const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
  padding: 0.4rem 0.75rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border-left: 2px solid ${({ theme }) => theme.colors.green};
`

export const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.green};
  box-shadow: 0 0 8px ${({ theme }) => theme.colors.green};
  animation: ${pulse} 2s ease-in-out infinite;
  flex-shrink: 0;
  display: inline-block;
`

// ── Form Elements ─────────────────────────────────────────
export const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`

export const FormLabel = styled.label`
  display: block;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
`

const inputBase = css`
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  resize: vertical;

  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }

  &:focus {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    border-left-color: ${({ theme }) => theme.colors.cyan};
    background: rgba(0,229,255,0.04);
    box-shadow: 0 0 0 1px rgba(0,229,255,0.1), inset 0 0 20px rgba(0,229,255,0.03);
  }
`

export const Input = styled.input`
  ${inputBase}
  height: 44px;
`

export const Textarea = styled.textarea`
  ${inputBase}
  min-height: 100px;
  padding-top: 0.75rem;
`

// ── Buttons ───────────────────────────────────────────────
export const Button = styled.button`
  display: ${({ $block }) => ($block ? 'block' : 'inline-flex')};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 48px;
  padding: 0 1.5rem;
  background: transparent;
  border: 1px solid ${({ theme, $variant }) =>
    $variant === 'green' ? theme.colors.green :
    $variant === 'red'   ? theme.colors.red   :
    theme.colors.cyan};
  color: ${({ theme, $variant }) =>
    $variant === 'green' ? theme.colors.green :
    $variant === 'red'   ? theme.colors.red   :
    theme.colors.cyan};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: color 0.3s;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme, $variant }) =>
      $variant === 'green' ? theme.colors.green :
      $variant === 'red'   ? theme.colors.red   :
      theme.colors.cyan};
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 0;
  }

  &:hover:not(:disabled)::before { transform: translateX(0); }
  &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.bgDeep}; }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  span { position: relative; z-index: 1; }
`

// ── Alert ─────────────────────────────────────────────────
export const Alert = styled.div`
  padding: 0.6rem 0.85rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  margin-bottom: 1.25rem;
  border-left: 3px solid;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  ${({ $type, theme }) => $type === 'error' && css`
    border-color: ${theme.colors.red};
    color: ${theme.colors.red};
    background: rgba(255,59,92,0.07);
  `}

  ${({ $type, theme }) => $type === 'success' && css`
    border-color: ${theme.colors.green};
    color: ${theme.colors.green};
    background: rgba(0,255,157,0.07);
  `}

  ${({ $type, theme }) => $type === 'info' && css`
    border-color: ${theme.colors.cyan};
    color: ${theme.colors.cyan};
    background: rgba(0,229,255,0.05);
  `}
`

// ── Divider ───────────────────────────────────────────────
export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.25rem 0;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
  text-transform: uppercase;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }
`

// ── Link styled text ──────────────────────────────────────
export const StyledLink = styled.span`
  color: ${({ theme }) => theme.colors.cyanDim};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.2s, text-shadow 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
    text-shadow: 0 0 10px rgba(0,229,255,0.5);
  }
`

// ── Spinner ───────────────────────────────────────────────
const SpinnerRing = styled.div`
  width: 40px;
  height: 40px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.cyan};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 3rem auto;
`

export function Spinner() {
  return <SpinnerRing />
}

// ── Mono text helpers ─────────────────────────────────────
export const Mono = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ $size }) => $size || '0.85rem'};
  color: ${({ theme, $muted }) => $muted ? theme.colors.textMuted : theme.colors.textSecondary};
  letter-spacing: ${({ $wide }) => $wide ? '0.1em' : 'normal'};
`

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.cyan};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 15px rgba(0,229,255,0.3);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

// ── Card (for problem list items) ─────────────────────────
export const Card = styled.div`
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    background: rgba(0,229,255,0.02);
  }
`

export const CardTitle = styled.h4`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
`

export const CardMeta = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`

export const CardBody = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 0.75rem;
  line-height: 1.5;
`

// Status badge
export const StatusBadge = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border: 1px solid;

  ${({ $status, theme }) => {
    switch ($status) {
      case 'На розгляді':
        return css`border-color: #ff9100; color: #ff9100;`
      case 'Прийнято':
        return css`border-color: ${theme.colors.cyan}; color: ${theme.colors.cyan};`
      case 'Приймання ціни':
        return css`border-color: #e040fb; color: #e040fb;`
      case 'У роботі':
        return css`border-color: ${theme.colors.greenDim}; color: ${theme.colors.greenDim};`
      case 'Очікує завершення':
        return css`border-color: #c6ff00; color: #c6ff00;`
      case 'Прийняття оплати':
        return css`border-color: #ffab40; color: #ffab40;`
      case 'Готово до видачі':
        return css`border-color: #00ff9d; color: #00ff9d;`
      case 'Завершено':
        return css`border-color: ${theme.colors.green}; color: ${theme.colors.green};`
      case 'Відхилено':
        return css`border-color: ${theme.colors.red}; color: ${theme.colors.red};`
      case 'Є відповідь':
        return css`border-color: ${theme.colors.cyan}; color: ${theme.colors.cyan};`
      default:
        return css`border-color: ${theme.colors.textMuted}; color: ${theme.colors.textMuted};`
    }
  }}
`

// Pre block for warranty/work info
export const Pre = styled.pre`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgInput};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  margin: 0.5rem 0 1rem;
`

export const RowActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`
