import { Link } from 'react-router-dom'
import styled from 'styled-components'

export default function Footer() {
  return (
    <FooterWrap>
      <FooterTop>
        <FooterBrand to="/">TECH<BrandSep>//</BrandSep>FIX</FooterBrand>

        <FooterNav>
          <FooterCol>
            <FooterColTitle>Платформа</FooterColTitle>
            <FooterLink to="/">Головна</FooterLink>
            <FooterLink to="/requests/new">Нова заявка</FooterLink>
            <FooterLink to="/requests">Мої заявки</FooterLink>
          </FooterCol>

          <FooterCol>
            <FooterColTitle>Акаунт</FooterColTitle>
            <FooterLink to="/login">Увійти</FooterLink>
            <FooterLink to="/register">Реєстрація</FooterLink>
          </FooterCol>

          <FooterCol>
            <FooterColTitle>Підтримка</FooterColTitle>
            <FooterLink to="/requests/new">Зв'язатися з нами</FooterLink>
            <FooterStatic>Telegram бот</FooterStatic>
            <FooterStatic>FAQ</FooterStatic>
          </FooterCol>
        </FooterNav>
      </FooterTop>

      <FooterDivider />

      <FooterBottom>
        <FooterCopy>&copy; {new Date().getFullYear()} TechFix. Усі права захищені.</FooterCopy>
        <FooterTag>Smart Service Platform • Online Support</FooterTag>
      </FooterBottom>
    </FooterWrap>
  )
}

const FooterWrap = styled.footer`
  margin-top: 4rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgPanel};
  padding: 2.5rem 2rem 1.5rem;
`

const FooterTop = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 2rem;
  }
`

const FooterBrand = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.cyan};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 15px rgba(0,229,255,0.4);
  text-decoration: none;
  flex-shrink: 0;
`

const BrandSep = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`

const FooterNav = styled.div`
  display: flex;
  gap: 3rem;
  flex: 1;

  @media (max-width: 640px) {
    gap: 2rem;
  }
`

const FooterCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FooterColTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
`

const FooterLink = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
  }
`

const FooterStatic = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.05em;
`

const FooterDivider = styled.div`
  max-width: 1100px;
  margin: 2rem auto 1.25rem;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`

const FooterBottom = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const FooterCopy = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
`

const FooterTag = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.25em;
  text-transform: uppercase;
`
