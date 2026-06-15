import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { register } from "../api/client";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tgCode, setTgCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Пароль повинен містити щонайменше 8 символів";
    }

    if (!/[A-Za-zА-Яа-яЇїІіЄєҐґ]/.test(password)) {
      return "Пароль повинен містити хоча б одну літеру";
    }

    if (!/\d/.test(password)) {
      return "Пароль повинен містити хоча б одну цифру";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const { data } = await register(form.username, form.email, form.password);

      setSuccess("Ви успішно створили акаунт!");

      if (data.tg_code) {
        setTgCode(data.tg_code);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Помилка реєстрації");
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
            <PanelSubtitle>Новий обліковий запис</PanelSubtitle>
          </PanelHeader>

          <StatusBar>
            <StatusDot />
            Реєстрація нового користувача
          </StatusBar>

          {error && (
            <Alert $type="error">
              <span>&#x26A0;</span>
              <span>{error}</span>
            </Alert>
          )}

          {success && (
            <Alert $type="success">
              <span>&#x2713;</span>
              <span>
                {success}
                {tgCode && (
                  <>
                    <br />
                    Для Telegram-сповіщень: надайте боту код{" "}
                    <strong style={{ letterSpacing: "0.2em" }}>{tgCode}</strong>
                  </>
                )}
              </span>
            </Alert>
          )}

          {success ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {tgCode && (
                <Button
                  as="a"
                  href={`https://t.me/techfixnotify_bot?start=${tgCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  $variant="green"
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%"
                  }}
                >
                  <span>Прив'язати в Telegram 🚀</span>
                </Button>
              )}
              <Button $block onClick={() => navigate("/login")}>
                <span>Увійти до системи</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <FormLabel htmlFor="username">Логін</FormLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="придумайте логін"
                  autoComplete="username"
                  value={form.username}
                  onChange={set("username")}
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="email">Email</FormLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel htmlFor="password">Пароль</FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="мінімум 8 символів"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  required
                />
              </FormGroup>

              <Button
                $block
                $variant="green"
                type="submit"
                disabled={loading}
                style={{ marginTop: "1rem" }}
              >
                <span>{loading ? "Створення..." : "Створити акаунт"}</span>
              </Button>
            </form>
          )}

          <Divider>або</Divider>

          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              color: "#2a4060",
            }}
          >
            Вже є акаунт?{" "}
            <StyledLink as={Link} to="/login" style={{ marginLeft: "0.4rem" }}>
              Увійти
            </StyledLink>
          </p>
        </Panel>
      </PageWrapper>
      <Footer />
    </>
  );
}
