import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ContentWrapper,
  SectionTitle,
  Panel,
  PanelCorners,
  FormGroup,
  FormLabel,
  Input,
  Button,
  Alert,
  Divider,
  Mono,
  Spinner,
} from "../components/ui";
import {
  getMe,
  changeUsername,
  getTelegramStatus,
  unlinkTelegram,
} from "../api/client";
import { useAuth } from "../context/AuthContext";

const roleTranslations = {
  client: "Клієнт",
  master: "Майстер",
  manager: "Менеджер",
  admin: "Адміністратор",
};

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [tgStatus, setTgStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usernameInput, setNewUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch full user and telegram info
  useEffect(() => {
    Promise.all([getMe(), getTelegramStatus()])
      .then(([{ data: meData }, { data: tgData }]) => {
        setUserInfo(meData);
        setTgStatus(tgData);
        setNewUsername(meData.username);
      })
      .catch((err) => {
        setError("Не вдалося завантажити дані акаунту");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!usernameInput.trim()) {
      setError("Нікнейм не може бути порожнім");
      return;
    }
    if (usernameInput.trim() === userInfo?.username) {
      setIsEditingUsername(false);
      return;
    }
    setActionLoading(true);
    try {
      const { data } = await changeUsername(usernameInput.trim());
      setUserInfo((prev) => ({ ...prev, username: data.username }));
      setUser((prev) => ({ ...prev, username: data.username })); // Update auth context state
      setSuccess("Нікнейм успішно оновлено!");
      setIsEditingUsername(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Не вдалося змінити нікнейм");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!window.confirm("Ви дійсно хочете від'єднати Telegram-бота?")) {
      return;
    }
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const { data } = await unlinkTelegram();
      setTgStatus((prev) => ({
        ...prev,
        is_linked: false,
        tg_code: data.tg_code,
        tg_bot_url: `https://t.me/techfixnotify_bot?start=${data.tg_code}`,
      }));
      setSuccess("Telegram-бота успішно від'єднано!");
    } catch (err) {
      setError(err.response?.data?.detail || "Не вдалося від'єднати Telegram");
    } finally {
      setActionLoading(false);
    }
  };

  const refreshTelegramStatus = async () => {
    try {
      const { data } = await getTelegramStatus();
      setTgStatus(data);
      if (data.is_linked) {
        setSuccess("Telegram успішно прив'язано!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Navbar />
      <ContentWrapper>
        <SectionTitle>Мій Аккаунт</SectionTitle>

        {loading && <Spinner />}

        {error && (
          <Alert $type="error">
            <span>&#x26A0;</span>
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert $type="success">
            <span>✓</span>
            <span>{success}</span>
          </Alert>
        )}

        {!loading && userInfo && (
          <LayoutGrid>
            {/* User Profile Card */}
            <Panel $wide>
              <PanelCorners />
              <CardHeader>
                <HeaderIcon>👤</HeaderIcon>
                <div>
                  <HeaderTitle>Профіль користувача</HeaderTitle>
                  <HeaderSub>Основні дані вашого облікового запису</HeaderSub>
                </div>
              </CardHeader>

              <Divider>Ідентифікація</Divider>

              <InfoRow>
                <InfoLabel>ID Користувача</InfoLabel>
                <InfoValue><CodeText># {userInfo.id}</CodeText></InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Електронна пошта</InfoLabel>
                <InfoValue>{userInfo.email}</InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Роль в системі</InfoLabel>
                <InfoValue>
                  <RoleBadge $role={userInfo.role}>
                    {roleTranslations[userInfo.role] || userInfo.role}
                  </RoleBadge>
                </InfoValue>
              </InfoRow>

              <Divider>Редагування</Divider>

              {isEditingUsername ? (
                <form onSubmit={handleUpdateUsername}>
                  <FormGroup>
                    <FormLabel htmlFor="username">Нікнейм (Логін)</FormLabel>
                    <Input
                      id="username"
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      disabled={actionLoading}
                      style={{ width: "100%", marginBottom: "0.75rem" }}
                    />
                    <ButtonGroup>
                      <Button
                        type="submit"
                        $variant="green"
                        disabled={actionLoading}
                        style={{ height: "40px" }}
                      >
                        <span>Зберегти</span>
                      </Button>
                      <Button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          setNewUsername(userInfo.username);
                          setIsEditingUsername(false);
                        }}
                        style={{ height: "40px" }}
                      >
                        <span>Скасувати</span>
                      </Button>
                    </ButtonGroup>
                  </FormGroup>
                </form>
              ) : (
                <InfoRow>
                  <InfoLabel>Нікнейм (Логін)</InfoLabel>
                  <InfoValue style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span>{userInfo.username}</span>
                    <EditLink onClick={() => setIsEditingUsername(true)}>
                      [ Змінити ]
                    </EditLink>
                  </InfoValue>
                </InfoRow>
              )}
            </Panel>

            {/* Telegram Binding Card */}
            <Panel $wide>
              <PanelCorners />
              <CardHeader>
                <HeaderIcon style={{ color: "#00e5ff" }}>🤖</HeaderIcon>
                <div>
                  <HeaderTitle>Telegram Сповіщення</HeaderTitle>
                  <HeaderSub>Прив'язка бота для миттєвих повідомлень про статус заявок</HeaderSub>
                </div>
              </CardHeader>

              <Divider>Статус підключення</Divider>

              {tgStatus && (
                <>
                  <StatusContainer>
                    <StatusIndicator $linked={tgStatus.is_linked}>
                      <IndicatorDot $linked={tgStatus.is_linked} />
                      {tgStatus.is_linked
                        ? "Telegram успішно прив'язано"
                        : "Telegram не прив'язано"}
                    </StatusIndicator>
                    {tgStatus.is_linked && tgStatus.user_tg_id && (
                      <TgIdText>ID чату: {tgStatus.user_tg_id}</TgIdText>
                    )}
                  </StatusContainer>

                  {!tgStatus.is_linked ? (
                    <InstructionBox>
                      <InstructionTitle>Як виконати прив'язку:</InstructionTitle>
                      <p>
                        1. Скопіюйте ваш персональний одноразовий код підключення:
                      </p>
                      <CodeBlockContainer>
                        <CodeBlock>{tgStatus.tg_code}</CodeBlock>
                      </CodeBlockContainer>
                      <p>
                        2. Перейдіть у Telegram-бот за посиланням нижче та надішліть цей код боту, або просто натисніть кнопку "Прив'язати в Telegram" (код надішлеться автоматично).
                      </p>
                      <ButtonContainer style={{ marginTop: "1.5rem" }}>
                        <Button
                          as="a"
                          href={tgStatus.tg_bot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          $variant="green"
                          style={{ textDecoration: "none", width: "100%" }}
                        >
                          <span>Прив'язати в Telegram 🚀</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={refreshTelegramStatus}
                          style={{ width: "100%" }}
                        >
                          <span>Перевірити статус 🔄</span>
                        </Button>
                      </ButtonContainer>
                    </InstructionBox>
                  ) : (
                    <ConnectedBox>
                      <p>
                        Вітаємо! Ви підключили Telegram сповіщення. Тепер при зміні статусу будь-якої вашої заявки чи відповіді майстра, ви миттєво отримаєте повідомлення у свій месенджер.
                      </p>
                      <ButtonContainer style={{ marginTop: "1.5rem" }}>
                        <Button
                          type="button"
                          as="a"
                          href={tgStatus.tg_bot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none", width: "100%" }}
                        >
                          <span>Перейти до бота 💬</span>
                        </Button>
                        <Button
                          type="button"
                          $variant="red"
                          disabled={actionLoading}
                          onClick={handleUnlinkTelegram}
                          style={{ width: "100%" }}
                        >
                          <span>{actionLoading ? "Обробка..." : "Відв'язати Telegram ❌"}</span>
                        </Button>
                      </ButtonContainer>
                    </ConnectedBox>
                  )}
                </>
              )}
            </Panel>
          </LayoutGrid>
        )}
      </ContentWrapper>
      <Footer />
    </>
  );
}

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-top: 2rem;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
`;

const HeaderIcon = styled.div`
  font-size: 2.25rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.2));
`;

const HeaderTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
`;

const HeaderSub = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0.15rem 0 0;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 0;
  border-bottom: 1px dashed rgba(13, 32, 64, 0.4);
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CodeText = styled.span`
  color: ${({ theme }) => theme.colors.cyan};
  font-weight: 500;
`;

const RoleBadge = styled.span`
  display: inline-block;
  font-size: 0.7rem;
  padding: 0.15rem 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-weight: bold;
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

const EditLink = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.cyanDim};
  cursor: pointer;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: color 0.2s, text-shadow 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
    text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StatusContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 1.5rem;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: ${({ $linked, theme }) => ($linked ? theme.colors.green : theme.colors.textSecondary)};
  text-transform: uppercase;
`;

const IndicatorDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $linked, theme }) => ($linked ? theme.colors.green : theme.colors.red)};
  box-shadow: 0 0 10px ${({ $linked, theme }) => ($linked ? theme.colors.green : theme.colors.red)};
`;

const TgIdText = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const InstructionBox = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;

  p {
    margin: 0.5rem 0;
  }
`;

const InstructionTitle = styled.h4`
  font-family: ${({ theme }) => theme.fonts.mono};
  color: ${({ theme }) => theme.colors.cyanDim};
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  margin: 0 0 0.75rem;
`;

const CodeBlockContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 1rem 0;
`;

const CodeBlock = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 1.75rem;
  font-weight: bold;
  letter-spacing: 0.25em;
  color: ${({ theme }) => theme.colors.green};
  background: ${({ theme }) => theme.colors.bgInput};
  border: 1px dashed ${({ theme }) => theme.colors.greenDim};
  padding: 0.75rem 1.5rem;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  box-shadow: 0 0 15px rgba(0, 255, 157, 0.1);
  text-shadow: 0 0 10px rgba(0, 255, 157, 0.3);
`;

const ConnectedBox = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (min-width: 480px) {
    flex-direction: row;
  }
`;
