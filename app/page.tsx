"use client";

import { useEffect, useMemo, useState } from "react";
import questionData from "../data/questions.json";

type Question = {
  id: string;
  subject: string;
  unit: string;
  type: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  sourceId: string;
  verified: boolean;
};

type Screen = "home" | "quiz" | "result" | "review";

type HistoryItem = {
  id: number;
  date: string;
  score: number;
  correct: number;
  total: number;
};

const questions = questionData as Question[];
const HISTORY_KEY = "ace-cbt-history-v1";
const WRONG_KEY = "ace-cbt-wrong-v1";

const navItems = [
  { key: "home", icon: "⌂", label: "학습 홈" },
  { key: "quiz", icon: "▣", label: "문제 풀이" },
  { key: "exam", icon: "◷", label: "모의고사" },
  { key: "review", icon: "✓", label: "오답노트" },
];

function formatTime(seconds: number) {
  const minute = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const second = (seconds % 60).toString().padStart(2, "0");
  return `${minute}:${second}`;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(8 * 60);
  const [showSubmit, setShowSubmit] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[current];
  const isSubmitOpen =
    showSubmit || (screen === "quiz" && timeLeft <= 0);

  const result = useMemo(() => {
    const correct = questions.filter(
      (question) => answers[question.id] === question.answer,
    ).length;
    return {
      correct,
      total: questions.length,
      score: Math.round((correct / questions.length) * 100),
      wrong: questions.filter(
        (question) => answers[question.id] !== question.answer,
      ),
    };
  }, [answers]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const storedHistory = window.localStorage.getItem(HISTORY_KEY);
      const storedWrong = window.localStorage.getItem(WRONG_KEY);

      if (storedHistory) {
        try {
          setHistory(JSON.parse(storedHistory));
        } catch {
          window.localStorage.removeItem(HISTORY_KEY);
        }
      }

      if (storedWrong) {
        try {
          setWrongIds(JSON.parse(storedWrong));
        } catch {
          window.localStorage.removeItem(WRONG_KEY);
        }
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (screen !== "quiz" || showSubmit) return;
    if (timeLeft <= 0) return;

    const timer = window.setInterval(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, showSubmit, timeLeft]);

  const startQuiz = () => {
    setAnswers({});
    setCurrent(0);
    setTimeLeft(8 * 60);
    setShowSubmit(false);
    setScreen("quiz");
  };

  const submitQuiz = () => {
    const wrong = questions
      .filter((question) => answers[question.id] !== question.answer)
      .map((question) => question.id);
    const nextWrong = Array.from(new Set([...wrongIds, ...wrong]));
    const nextHistory: HistoryItem[] = [
      {
        id: Date.now(),
        date: new Intl.DateTimeFormat("ko-KR", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
        score: result.score,
        correct: result.correct,
        total: result.total,
      },
      ...history,
    ].slice(0, 6);

    setWrongIds(nextWrong);
    setHistory(nextHistory);
    window.localStorage.setItem(WRONG_KEY, JSON.stringify(nextWrong));
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setShowSubmit(false);
    setScreen("result");
  };

  const moveScreen = (key: string) => {
    if (key === "home") setScreen("home");
    if (key === "quiz" || key === "exam") startQuiz();
    if (key === "review") setScreen("review");
  };

  const toggleBookmark = (id: string) => {
    setBookmarks((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setScreen("home")}>
          <span className="brand-mark">A</span>
          <span>
            <strong>ACE STUDY</strong>
            <small>AI 자격 학습 시스템</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="주요 메뉴">
          <p className="nav-title">LEARNING</p>
          {navItems.map((item) => {
            const active =
              (item.key === "home" && screen === "home") ||
              (item.key === "quiz" && screen === "quiz") ||
              (item.key === "review" && screen === "review");
            return (
              <button
                className={`nav-item ${active ? "active" : ""}`}
                key={item.key}
                onClick={() => moveScreen(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="side-status">
          <div className="side-status-head">
            <span>이번 주 학습</span>
            <strong>68%</strong>
          </div>
          <div className="mini-progress">
            <i style={{ width: "68%" }} />
          </div>
          <small>목표까지 2회 남았어요</small>
        </div>

        <div className="profile">
          <span className="avatar">학</span>
          <span>
            <strong>나의 학습 공간</strong>
            <small>브라우저 저장 모드</small>
          </span>
          <span className="more">•••</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="mobile-brand">ACE STUDY</span>
            <p className="breadcrumb">
              {screen === "home" && "학습 홈"}
              {screen === "quiz" && "데모 모의고사"}
              {screen === "result" && "학습 결과"}
              {screen === "review" && "오답노트"}
            </p>
          </div>
          <div className="top-actions">
            <span className="offline-chip">
              <i /> 내 기기에 안전하게 저장 중
            </span>
            <button className="icon-button" aria-label="알림">
              ♢
            </button>
          </div>
        </header>

        {screen === "home" && (
          <Dashboard
            history={history}
            wrongCount={wrongIds.length}
            onStart={startQuiz}
            onReview={() => setScreen("review")}
          />
        )}

        {screen === "quiz" && (
          <QuizScreen
            question={currentQuestion}
            current={current}
            answers={answers}
            bookmarks={bookmarks}
            timeLeft={timeLeft}
            answeredCount={answeredCount}
            onAnswer={(choice) =>
              setAnswers((items) => ({
                ...items,
                [currentQuestion.id]: choice,
              }))
            }
            onMove={setCurrent}
            onBookmark={() => toggleBookmark(currentQuestion.id)}
            onSubmit={() => setShowSubmit(true)}
            onExit={() => setScreen("home")}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            answers={answers}
            result={result}
            onHome={() => setScreen("home")}
            onRetry={startQuiz}
            onReview={() => setScreen("review")}
          />
        )}

        {screen === "review" && (
          <ReviewScreen
            wrongIds={wrongIds}
            onStart={startQuiz}
            onHome={() => setScreen("home")}
          />
        )}
      </main>

      {isSubmitOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="submit-modal" role="dialog" aria-modal="true">
            <span className="modal-icon">✓</span>
            <p className="eyebrow">답안 제출 확인</p>
            <h2>학습을 마칠까요?</h2>
            <p>
              총 {questions.length}문제 중 <strong>{answeredCount}문제</strong>에
              답했습니다. 미응답 {questions.length - answeredCount}문제는 오답으로
              처리됩니다.
            </p>
            <div className="modal-summary">
              <span>
                응답 완료 <strong>{answeredCount}</strong>
              </span>
              <span>
                미응답 <strong>{questions.length - answeredCount}</strong>
              </span>
            </div>
            <div className="modal-actions">
              {timeLeft > 0 && (
                <button className="button secondary" onClick={() => setShowSubmit(false)}>
                  계속 풀기
                </button>
              )}
              <button className="button primary" onClick={submitQuiz}>
                제출하고 채점하기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  history,
  wrongCount,
  onStart,
  onReview,
}: {
  history: HistoryItem[];
  wrongCount: number;
  onStart: () => void;
  onReview: () => void;
}) {
  const latest = history[0];

  return (
    <div className="page dashboard-page">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">PERSONAL LEARNING SYSTEM</p>
          <h1>오늘도 한 문제씩, 합격에 가까워져요.</h1>
          <p className="lead">
            데모 학습문제로 전체 CBT 흐름을 먼저 점검해보세요.
          </p>
        </div>
        <div className="date-badge">
          <span>오늘</span>
          <strong>21</strong>
          <small>JUL · TUE</small>
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">추천 학습</span>
          <h2>AI 활용 기초 · 데모 모의고사</h2>
          <p>
            5문항 · 제한시간 8분 · 자동 채점
            <br />
            문항과 기록은 공식 기출이 아닌 프로토타입 검증용입니다.
          </p>
          <div className="hero-actions">
            <button className="button light" onClick={onStart}>
              지금 시작하기 <span>→</span>
            </button>
            <span className="hero-note">예상 소요 5분</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-score">
            <span>학습 흐름</span>
            <strong>CBT</strong>
            <small>QUIZ · SCORE · REVIEW</small>
          </div>
        </div>
      </section>

      <section className="stat-grid" aria-label="학습 현황">
        <article className="stat-card">
          <span className="stat-icon mint">✓</span>
          <div>
            <p>최근 점수</p>
            <strong>{latest ? `${latest.score}점` : "—"}</strong>
            <small>{latest ? `${latest.correct}/${latest.total} 정답` : "첫 학습을 시작하세요"}</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">▤</span>
          <div>
            <p>누적 학습</p>
            <strong>{history.length}회</strong>
            <small>브라우저에 자동 저장</small>
          </div>
        </article>
        <article className="stat-card clickable" onClick={onReview}>
          <span className="stat-icon peach">!</span>
          <div>
            <p>오답 문제</p>
            <strong>{wrongCount}개</strong>
            <small>눌러서 다시 확인하기</small>
          </div>
          <span className="card-arrow">→</span>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel history-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h3>최근 학습 기록</h3>
            </div>
            <span className="text-button">최근 6회</span>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <span>◎</span>
              <strong>아직 저장된 기록이 없습니다.</strong>
              <p>첫 번째 데모 모의고사를 완료하면 이곳에 기록됩니다.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id}>
                  <span className="history-dot" />
                  <div>
                    <strong>AI 활용 기초 · 데모</strong>
                    <small>{item.date}</small>
                  </div>
                  <span className="history-score">{item.score}점</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel source-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">SOURCE STATUS</p>
              <h3>자료 검증 상태</h3>
            </div>
          </div>
          <div className="source-chart">
            <div className="donut"><span>DEMO</span></div>
            <div className="source-legend">
              <p><i className="legend-dot green" /> 데모 학습문제 <strong>5</strong></p>
              <p><i className="legend-dot gray" /> 공식 확인 문항 <strong>0</strong></p>
            </div>
          </div>
          <div className="notice-box">
            <span>i</span>
            <p>공식 출처가 확인되기 전에는 기출문제로 표시하지 않습니다.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

function QuizScreen({
  question,
  current,
  answers,
  bookmarks,
  timeLeft,
  answeredCount,
  onAnswer,
  onMove,
  onBookmark,
  onSubmit,
  onExit,
}: {
  question: Question;
  current: number;
  answers: Record<string, number>;
  bookmarks: string[];
  timeLeft: number;
  answeredCount: number;
  onAnswer: (choice: number) => void;
  onMove: (index: number) => void;
  onBookmark: () => void;
  onSubmit: () => void;
  onExit: () => void;
}) {
  return (
    <div className="page quiz-page">
      <section className="quiz-heading">
        <div>
          <p className="eyebrow">DEMO LEARNING TEST</p>
          <h1>AI 활용 기초 · 데모 모의고사</h1>
          <p>공식 기출이 아닌 기능 검증용 학습문제입니다.</p>
        </div>
        <div className={`timer ${timeLeft < 60 ? "danger" : ""}`}>
          <span>남은 시간</span>
          <strong>{formatTime(timeLeft)}</strong>
        </div>
      </section>

      <div className="quiz-layout">
        <section className="question-card">
          <div className="question-meta">
            <span className="question-number">문제 {current + 1}</span>
            <span>{question.subject} · {question.unit}</span>
            <button
              className={`bookmark ${bookmarks.includes(question.id) ? "saved" : ""}`}
              onClick={onBookmark}
              aria-label="문제 북마크"
            >
              {bookmarks.includes(question.id) ? "★" : "☆"}
            </button>
          </div>
          <h2>{question.question}</h2>
          <div className="choice-list">
            {question.choices.map((choice, index) => (
              <button
                className={`choice ${answers[question.id] === index ? "selected" : ""}`}
                key={choice}
                onClick={() => onAnswer(index)}
              >
                <span>{index + 1}</span>
                <strong>{choice}</strong>
                <i>{answers[question.id] === index ? "✓" : ""}</i>
              </button>
            ))}
          </div>
          <div className="question-actions">
            <button
              className="button secondary"
              disabled={current === 0}
              onClick={() => onMove(current - 1)}
            >
              ← 이전 문제
            </button>
            {current < questions.length - 1 ? (
              <button className="button primary" onClick={() => onMove(current + 1)}>
                다음 문제 →
              </button>
            ) : (
              <button className="button primary" onClick={onSubmit}>
                답안 제출하기
              </button>
            )}
          </div>
        </section>

        <aside className="answer-panel">
          <div className="answer-panel-head">
            <h3>답안 현황</h3>
            <strong>{answeredCount}/{questions.length}</strong>
          </div>
          <div className="answer-progress">
            <i style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
          <div className="answer-grid">
            {questions.map((item, index) => (
              <button
                key={item.id}
                className={`${index === current ? "current" : ""} ${answers[item.id] !== undefined ? "answered" : ""}`}
                onClick={() => onMove(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="answer-legend">
            <span><i className="legend current" />현재</span>
            <span><i className="legend answered" />응답</span>
            <span><i className="legend" />미응답</span>
          </div>
          <button className="submit-wide" onClick={onSubmit}>답안 제출</button>
          <button className="exit-link" onClick={onExit}>학습 홈으로 나가기</button>
        </aside>
      </div>
    </div>
  );
}

function ResultScreen({
  answers,
  result,
  onHome,
  onRetry,
  onReview,
}: {
  answers: Record<string, number>;
  result: { correct: number; total: number; score: number; wrong: Question[] };
  onHome: () => void;
  onRetry: () => void;
  onReview: () => void;
}) {
  const circumference = 2 * Math.PI * 54;
  const dash = (result.score / 100) * circumference;

  return (
    <div className="page result-page">
      <section className="result-hero panel">
        <div className="score-ring">
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <circle cx="64" cy="64" r="54" className="score-track" />
            <circle
              cx="64"
              cy="64"
              r="54"
              className="score-value"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <span><strong>{result.score}</strong>점</span>
        </div>
        <div className="result-copy">
          <p className="eyebrow">LEARNING RESULT</p>
          <h1>{result.score >= 80 ? "좋아요, 핵심 개념을 잘 이해했어요." : "오답을 확인하면 다음 점수가 달라져요."}</h1>
          <p>데모 문제 기준 결과이며 실제 자격시험의 합격 여부와 관계없습니다.</p>
          <div className="result-metrics">
            <span>정답 <strong>{result.correct}</strong></span>
            <span>오답·미응답 <strong>{result.total - result.correct}</strong></span>
            <span>총 문항 <strong>{result.total}</strong></span>
          </div>
          <div className="result-actions">
            <button className="button primary" onClick={onReview}>오답노트 보기</button>
            <button className="button secondary" onClick={onRetry}>다시 풀기</button>
            <button className="text-link" onClick={onHome}>학습 홈</button>
          </div>
        </div>
      </section>

      <section className="panel solution-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">ANSWER REVIEW</p>
            <h3>문제별 정답과 해설</h3>
          </div>
          <span className="demo-badge">데모 학습문제</span>
        </div>
        <div className="solution-list">
          {questions.map((question, index) => {
            const isCorrect = answers[question.id] === question.answer;
            return (
              <details className={`solution-item ${isCorrect ? "correct" : "wrong"}`} key={question.id} open={!isCorrect}>
                <summary>
                  <span className="result-mark">{isCorrect ? "✓" : "!"}</span>
                  <div>
                    <small>문제 {index + 1} · {question.unit}</small>
                    <strong>{question.question}</strong>
                  </div>
                  <span className="solution-status">{isCorrect ? "정답" : "오답"}</span>
                </summary>
                <div className="solution-body">
                  <p><b>내 답</b> {answers[question.id] !== undefined ? question.choices[answers[question.id]] : "미응답"}</p>
                  <p><b>정답</b> {question.choices[question.answer]}</p>
                  <div className="explanation"><b>해설</b><p>{question.explanation}</p></div>
                  <small>출처 상태: {question.sourceId} · 검증 전 데모 데이터</small>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ReviewScreen({
  wrongIds,
  onStart,
  onHome,
}: {
  wrongIds: string[];
  onStart: () => void;
  onHome: () => void;
}) {
  const wrongQuestions = questions.filter((question) => wrongIds.includes(question.id));

  return (
    <div className="page review-page">
      <section className="review-heading">
        <div>
          <p className="eyebrow">WRONG ANSWER NOTE</p>
          <h1>틀린 문제를 다시 이해하는 시간</h1>
          <p>최근 학습에서 틀렸거나 답하지 않은 데모 문항을 모았습니다.</p>
        </div>
        <button className="button primary" onClick={onStart}>전체 다시 풀기</button>
      </section>

      {wrongQuestions.length === 0 ? (
        <section className="panel empty-review">
          <span>✓</span>
          <h2>저장된 오답이 없습니다.</h2>
          <p>데모 모의고사를 풀면 틀린 문제가 자동으로 기록됩니다.</p>
          <div>
            <button className="button primary" onClick={onStart}>데모 문제 풀기</button>
            <button className="button secondary" onClick={onHome}>학습 홈</button>
          </div>
        </section>
      ) : (
        <section className="review-list">
          {wrongQuestions.map((question, index) => (
            <article className="panel review-card" key={question.id}>
              <div className="review-number">{index + 1}</div>
              <div>
                <p className="review-meta">{question.subject} · {question.unit}</p>
                <h2>{question.question}</h2>
                <div className="review-answer"><span>정답</span>{question.choices[question.answer]}</div>
                <div className="review-explanation"><span>해설</span><p>{question.explanation}</p></div>
              </div>
              <span className="demo-badge">학습문제</span>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
