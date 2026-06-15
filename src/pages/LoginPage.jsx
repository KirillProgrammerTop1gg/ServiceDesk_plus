import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  PageWrapper,
  Panel,
  PanelCorners,
  PanelHeader,
  LogoIcon,
  PanelTitle,
  PanelSubtitle,
  StatusBar,
  StatusDot,
  FormGroup,
  FormLabel,
  Input,
  Button,
  Alert,
  Divider,
  StyledLink,
} from "../components/ui";
import { login } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { refetch } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      await refetch();
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Пароль або логін невірний, спробуйте ще раз",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <PageWrapper>
        <Panel>
          <PanelCorners />

          <PanelHeader>
            <LogoIcon>&#9670;</LogoIcon>
            <PanelTitle>TechFix</PanelTitle>
            <PanelSubtitle>Авторизація / Auth</PanelSubtitle>
          </PanelHeader>

          <StatusBar>
            <StatusDot />
            Система онлайн — очікує ідентифікації
          </StatusBar>

          {error && (
            <Alert $type="error">
              <span>&#x26A0;</span>
              <span>{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="username">Логін</FormLabel>
              <Input
                id="username"
                type="text"
                placeholder="user_handle"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="password">Пароль</FormLabel>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormGroup>

            <Button
              $block
              type="submit"
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              <span>{loading ? "Вхід..." : "Увійти до системи"}</span>
            </Button>
          </form>

          <Divider>або</Divider>

          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              color: "#2a4060",
            }}
          >
            Немає акаунту?{" "}
            <StyledLink
              as={Link}
              to="/register"
              style={{ marginLeft: "0.4rem" }}
            >
              Реєстрація
            </StyledLink>
          </p>
        </Panel>
      </PageWrapper>
      <Footer />
    </>
  );
}
