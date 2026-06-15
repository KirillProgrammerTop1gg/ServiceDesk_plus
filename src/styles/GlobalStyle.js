import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    background: ${({ theme }) => theme.colors.bgDeep};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* Scanline overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 229, 255, 0.015) 2px,
      rgba(0, 229, 255, 0.015) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  /* Grid background */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,100,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,100,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  @keyframes scanline {
    0%   { opacity: 0.3; }
    50%  { opacity: 1; }
    100% { opacity: 0.3; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`
