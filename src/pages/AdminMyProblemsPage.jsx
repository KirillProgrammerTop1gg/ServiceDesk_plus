import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  ContentWrapper,
  SectionTitle,
  Card,
  CardTitle,
  CardMeta,
  CardBody,
  RowActions,
  Button,
  Spinner,
  Alert,
  Panel,
  Pre,
  Mono,
} from "../components/ui";
import { getAdminProblems, getMessage } from "../api/client";

export default function AdminMyProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answersMap, setAnswersMap] = useState({}); // problemId => answers array
const [expandedIds, setExpandedIds] = useState([]); // ids of problems with answers expanded

  useEffect(() => {
    getAdminProblems()
      .then(({ data }) => setProblems(data))
      .catch(() => setError("Помилка завантаження"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch answers for active problems
  useEffect(() => {
    if (loading) return; // wait until problems loaded
    const active = problems.filter((p) => !["Завершено", "Відхилено"].includes(p.status));
    if (active.length === 0) {
      setAnswersMap({});
      return;
    }
    Promise.all(
      active.map((p) =>
        getMessage(p.id)
          .then(({ data }) => ({ id: p.id, answers: data.answers }))
          .catch(() => ({ id: p.id, answers: [] }))
      )
    ).then((results) => {
      const map = {};
      results.forEach(({ id, answers }) => {
        map[id] = answers;
      });
      setAnswersMap(map);
    });
  }, [loading, problems]);

  const activeProblems = problems.filter((p) => !["Завершено", "Відхилено"].includes(p.status));

  const archivedProblems = problems.filter((p) => ["Завершено", "Відхилено"].includes(p.status));

  return (
    <>
      <Navbar />

      <ContentWrapper>
        <SectionTitle>
          {user && user.role === "master" ? "Мої незакриті запити" : "Всі незакриті запити"}
        </SectionTitle>

        {loading && <Spinner />}
        {error && (
          <Alert $type="error">
            <span>&#x26A0;</span>
            <span>{error}</span>
          </Alert>
        )}

        {!loading && activeProblems.length === 0 && (
          <Alert $type="info">
            <span>ℹ</span>
            <span>
              {user && user.role === "master"
                ? "У вас немає активних запитів."
                : "В системі немає незакритих запитів."}
            </span>
          </Alert>
        )}

        {activeProblems.map((p) => (
          <Card key={p.id}>
            <CardTitle>{p.title}</CardTitle>

            <CardMeta>
              {new Date(p.date_created).toLocaleDateString("uk-UA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardMeta>

            <CardBody>{p.description}</CardBody>

            <RowActions>
              <Button as={Link} to={`/requests/${p.id}`} $variant="cyan">
                <span>Керувати заявкою</span>
              </Button>
            </RowActions>

            {/* Answers section */}
            {answersMap[p.id] && answersMap[p.id].length > 0 && (
              <>
                <Button
                  onClick={() => setExpandedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                  $variant="cyan"
                  style={{ marginTop: "0.5rem" }}
                >
                  {expandedIds.includes(p.id) ? 'Сховати відповіді' : 'Показати відповіді'}
                </Button>
                {expandedIds.includes(p.id) && (
                  <div style={{ marginTop: "1rem" }}>
                    {answersMap[p.id].map((answer, idx) => (
                      <Panel $wide key={idx} style={{ marginBottom: idx < answersMap[p.id].length - 1 ? "1rem" : "0" }}>
                        <Mono $size="0.7rem" $wide style={{ display: "block", marginBottom: "0.75rem", color: "#0097aa", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                          Відповідь адміністратора
                        </Mono>
                        <Pre dangerouslySetInnerHTML={{ __html: answer.message }} />
                        <Mono $muted $size="0.65rem">{new Date(answer.date_responded).toLocaleString('uk-UA')}</Mono>
                        {answer?.is_read && (
                          <Mono $muted $size="0.65rem" style={{ marginTop: "0.5rem", color: "#00ff9d" }}>
                            ✓ Прочитано
                          </Mono>
                        )}
                      </Panel>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        ))}

        {archivedProblems.length > 0 && (
          <>
            <SectionTitle style={{ marginTop: "3rem" }}>
              Архів запитів
            </SectionTitle>

            {archivedProblems.map((p) => (
              <Card key={p.id}>
                <CardTitle>{p.title}</CardTitle>

                <CardMeta>
                  {new Date(p.date_created).toLocaleDateString("uk-UA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardMeta>

                <CardBody>{p.description}</CardBody>

                <RowActions>
                  {p.status === "Завершено" ? (
                    <Button
                      as={Link}
                      to={`/service-record/${p.id}`}
                      $variant="green"
                    >
                      <span>Талон обслуговування</span>
                    </Button>
                  ) : (
                    <Button
                      as={Link}
                      to={`/requests/${p.id}`}
                      $variant="cyan"
                    >
                      <span>Переглянути заявку</span>
                    </Button>
                  )}
                </RowActions>
              </Card>
            ))}
          </>
        )}
      </ContentWrapper>
    </>
  );
}
