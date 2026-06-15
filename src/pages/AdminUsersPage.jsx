import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  ContentWrapper,
  SectionTitle,
  Button,
  Spinner,
  Alert,
  Mono,
  Panel,
  PanelCorners,
} from "../components/ui";
import { getAdminUsers, changeUserRole } from "../api/client";

const roleTranslations = {
  client: "Клієнт",
  master: "Майстер",
  manager: "Менеджер",
  admin: "Адміністратор",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    getAdminUsers()
      .then(({ data }) => setUsers(data))
      .catch((err) => {
        console.error(err);
        setError("Не вдалося завантажити список користувачів");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setError("");
    setSuccess("");

    if (userId === currentUser?.id && newRole !== "admin") {
      const confirmSelfDemotion = window.confirm(
        "Увага! Ви намагаєтесь змінити власну роль. Якщо ви понизите свою роль, ви втратите доступ до цієї панелі. Продовжити?"
      );
      if (!confirmSelfDemotion) {
        // Reset role in dropdown by briefly re-rendering or mapping
        setUsers((prev) => [...prev]);
        return;
      }
    }

    setActionLoading(userId);
    try {
      await changeUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setSuccess(`Роль користувача успішно змінено на "${roleTranslations[newRole]}"!`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Не вдалося змінити роль користувача"
      );
      setTimeout(() => setError(""), 6000);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <HeaderRow>
          <div>
            <SectionTitle style={{ marginBottom: "0.25rem" }}>
              Керування ролями
            </SectionTitle>
            <SubtitleMono>
              СИСТЕМА КОНТРОЛЮ ДОСТУПУ // ВСЬОГО КОРИСТУВАЧІВ: {users.length}
            </SubtitleMono>
          </div>
          <Button as={Link} to="/admin" $variant="cyan">
            <span>← Панель адміна</span>
          </Button>
        </HeaderRow>

        {error && (
          <Alert $type="error" style={{ marginBottom: "1.5rem" }}>
            <span>&#x26A0;</span>
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert $type="success" style={{ marginBottom: "1.5rem" }}>
            <span>✓</span>
            <span>{success}</span>
          </Alert>
        )}

        <SearchWrapper>
          <SearchLabel>Фільтр бази користувачів:</SearchLabel>
          <SearchInput
            type="text"
            placeholder="Введіть нікнейм, email або роль..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchWrapper>

        {loading ? (
          <Spinner />
        ) : filteredUsers.length === 0 ? (
          <Alert $type="info">
            <span>ℹ</span>
            <span>Користувачів за даним запитом не знайдено.</span>
          </Alert>
        ) : (
          <GridContainer>
            {filteredUsers.map((u) => (
              <UserCard key={u.id}>
                <PanelCorners />
                <CardTop>
                  <AvatarCol>
                    <AvatarGlow $role={u.role}>
                      {u.username.substring(0, 2).toUpperCase()}
                    </AvatarGlow>
                  </AvatarCol>
                  <UserDetails>
                    <UsernameMono>
                      {u.username}{" "}
                      {u.id === currentUser?.id && <SelfTag>(Ви)</SelfTag>}
                    </UsernameMono>
                    <EmailText>{u.email}</EmailText>
                    <UserIdText>ID: {u.id}</UserIdText>
                  </UserDetails>
                </CardTop>

                <CardDivider />

                <CardControls>
                  <RoleLabelWrapper>
                    <ControlLabel>Поточна роль:</ControlLabel>
                    <RoleBadge $role={u.role}>
                      {roleTranslations[u.role] || u.role}
                    </RoleBadge>
                  </RoleLabelWrapper>

                  <ControlLabel style={{ marginTop: "1rem" }}>
                    Призначити нову роль:
                  </ControlLabel>
                  <SelectWrapper>
                    <StyledSelect
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={actionLoading === u.id}
                    >
                      <option value="client">Клієнт</option>
                      <option value="master">Майстер</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Адміністратор</option>
                    </StyledSelect>
                    {actionLoading === u.id && <MiniLoader />}
                  </SelectWrapper>
                </CardControls>
              </UserCard>
            ))}
          </GridContainer>
        )}
      </ContentWrapper>
      <Footer />
    </>
  );
}

// ── Animations ────────────────────────────────────────────
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const scanline = keyframes`
  0% { opacity: 0.3; }
  50% { opacity: 0.8; }
  100% { opacity: 0.3; }
`;

// ── Styled Components ─────────────────────────────────────
const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SubtitleMono = styled(Mono)`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  letter-spacing: 0.1em;
  display: block;
`;

const SearchWrapper = styled.div`
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.25rem 1.5rem;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.colors.cyan};
  }
`;

const SearchLabel = styled.label`
  display: block;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`;

const SearchInput = styled.input`
  display: block;
  width: 100%;
  height: 44px;
  padding: 0.6rem 1rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    border-left-color: ${({ theme }) => theme.colors.cyan};
    background: rgba(0, 229, 255, 0.04);
    box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.1),
      inset 0 0 20px rgba(0, 229, 255, 0.03);
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const UserCard = styled.div`
  background: ${({ theme }) => theme.colors.bgPanel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  clip-path: polygon(
    0 0,
    calc(100% - 15px) 0,
    100% 15px,
    100% 100%,
    15px 100%,
    0 calc(100% - 15px)
  );

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.colors.borderGlow},
      transparent
    );
    animation: ${scanline} 4s linear infinite;
  }
`;

const CardTop = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const AvatarCol = styled.div`
  flex-shrink: 0;
`;

const AvatarGlow = styled.div`
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-weight: bold;
  font-size: 1.1rem;
  border-radius: 50%;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border-radius: 0;

  ${({ $role, theme }) => {
    switch ($role) {
      case "admin":
        return css`
          border: 1px solid ${theme.colors.green};
          color: ${theme.colors.green};
          background: rgba(0, 255, 157, 0.08);
          box-shadow: 0 0 15px rgba(0, 255, 157, 0.2);
        `;
      case "manager":
        return css`
          border: 1px solid #d500f9;
          color: #d500f9;
          background: rgba(213, 0, 249, 0.08);
          box-shadow: 0 0 15px rgba(213, 0, 249, 0.2);
        `;
      case "master":
        return css`
          border: 1px solid #ff9d00;
          color: #ff9d00;
          background: rgba(255, 157, 0, 0.08);
          box-shadow: 0 0 15px rgba(255, 157, 0, 0.2);
        `;
      default:
        return css`
          border: 1px solid ${theme.colors.cyanDim};
          color: ${theme.colors.cyan};
          background: rgba(0, 229, 255, 0.08);
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
        `;
    }
  }}
`;

const UserDetails = styled.div`
  min-width: 0;
  flex-grow: 1;
`;

const UsernameMono = styled.h4`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: 0.05em;
  margin: 0 0 0.2rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const SelfTag = styled.span`
  color: ${({ theme }) => theme.colors.cyan};
  font-size: 0.75rem;
  margin-left: 0.25rem;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
`;

const EmailText = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-bottom: 0.2rem;
`;

const UserIdText = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.1em;
`;

const CardDivider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.border} 0%,
    transparent 100%
  );
  margin-bottom: 1rem;
`;

const CardControls = styled.div`
  display: flex;
  flex-direction: column;
`;

const RoleLabelWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ControlLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

const RoleBadge = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.65rem;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 2px;
  border: 1px solid;

  ${({ $role, theme }) => {
    switch ($role) {
      case "admin":
        return css`
          border-color: ${theme.colors.green};
          color: ${theme.colors.green};
          background: rgba(0, 255, 157, 0.04);
        `;
      case "manager":
        return css`
          border-color: #d500f9;
          color: #d500f9;
          background: rgba(213, 0, 249, 0.04);
        `;
      case "master":
        return css`
          border-color: #ff9d00;
          color: #ff9d00;
          background: rgba(255, 157, 0, 0.04);
        `;
      default:
        return css`
          border-color: ${theme.colors.cyanDim};
          color: ${theme.colors.cyan};
          background: rgba(0, 229, 255, 0.04);
        `;
    }
  }}
`;

const SelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 0.4rem;
`;

const StyledSelect = styled.select`
  display: block;
  width: 100%;
  height: 40px;
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 2px solid ${({ theme }) => theme.colors.borderGlow};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  cursor: pointer;
  appearance: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.cyanDim};
    border-left-color: ${({ theme }) => theme.colors.cyan};
    background: rgba(0, 229, 255, 0.04);
    box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.1),
      inset 0 0 20px rgba(0, 229, 255, 0.03);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: ${({ theme }) => theme.colors.bgPanel};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const MiniLoader = styled.div`
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: ${({ theme }) => theme.colors.cyan};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;
