import styled from 'styled-components'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <Nav>
      <Brand to="/">TECH<BrandSep>//</BrandSep>FIX</Brand>

      <NavLink to="/" $active={isActive('/')}>Головна</NavLink>

      {user && (
        <>
          <NavLink to="/requests" $active={isActive('/requests')}>
            {user.role === 'client' ? 'Мої заявки' : 'Заявки'}
          </NavLink>

          <NavLink to="/account" $active={isActive('/account')}>
            Аккаунт
          </NavLink>

          <NavBtn as="button" onClick={handleLogout}>Вийти</NavBtn>
        </>
      )}

      {!user && (
        <>
          <NavLink to="/login" $active={isActive('/login')}>Увійти</NavLink>
          <NavBtn to="/register" as={Link}>Реєстрація</NavBtn>
        </>
      )}
    </Nav>
  )
}

const Nav = styled.nav`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 52px;
  background: rgba(4,8,16,0.92);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  padding: 0 2rem;
  gap: 1.5rem;
  backdrop-filter: blur(8px);
`

const Brand = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.cyan};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 15px rgba(0,229,255,0.4);
  text-decoration: none;
  flex: 1;
`

const BrandSep = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`

const NavLink = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ $active, theme }) => $active ? theme.colors.cyan : theme.colors.textSecondary};
  text-decoration: none;
  padding: 0.3rem 0.6rem;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.border : 'transparent'};
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
    border-color: ${({ theme }) => theme.colors.border};
  }
`

const NavBtn = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.cyanDim};
  color: ${({ theme }) => theme.colors.cyan};
  padding: 0.35rem 1rem;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  display: inline-flex;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.colors.cyanGlow};
  }
`
