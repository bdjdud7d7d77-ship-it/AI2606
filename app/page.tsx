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
  shortExplanation: string;
  detailedExplanation: string;
  sourceId: string;
  verified: boolean;
};

type Screen = "home" | "units" | "quiz" | "result" | "review";

type HistoryItem = {
  id: number;
  date: string;
  score: number;
  correct: number;
  total: number;
  title?: string;
};

type QuizResult = {
  correct: number;
  total: number;
  score: number;
  wrong: Question[];
};

const questions = questionData as Question[];
const units = Array.from(new Set(questions.map((question) => question.unit)));
const HISTORY_KEY = "ace-cbt-history-v2";
const WRONG_KEY = "ace-cbt-wrong-v2";
const WRONG_NOTES_KEY = "ace-cbt-wrong-notes-v1";
const EXCLUDED_KEY = "ace-cbt-excluded-v1";

const navItems = [
  { key: "home", icon: "⌂", label: "학습 홈" },
  { key: "units", icon: "▣", label: "문제 풀이" },
  { key: "review", icon: "✓", label: "오답노트" },
];

function formatTime(seconds: number) {
  const minute = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const second = (seconds % 60).toString().padStart(2, "0");
  return `${minute}:${second}`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소가 차단되어도 현재 학습은 계속 진행합니다.
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(questions);
  const [quizTitle, setQuizTitle] = useState("전체 문제");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(8 * 60);
  const [showSubmit, setShowSubmit] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [wrongNotes, setWrongNotes] = useState<Record<string, string>>({});
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const activeQuestions = useMemo(
    () => questions.filter((question) => !excludedIds.includes(question.id)),
    [excludedIds],
  );
  const answeredCount = quizQuestions.filter(
    (question) => answers[question.id] !== undefined,
  ).length;
  const currentQuestion = quizQuestions[current];
  const isSubmitOpen =
    showSubmit || (screen === "quiz" && timeLeft <= 0);

  const result = useMemo<QuizResult>(() => {
    const correct = quizQuestions.filter(
      (question) => answers[question.id] === question.answer,
    ).length;
    const total = quizQuestions.length;
    return {
      correct,
      total,
      score: total ? Math.round((correct / total) * 100) : 0,
      wrong: quizQuestions.filter(
        (question) => answers[question.id] !== question.answer,
      ),
    };
  }, [answers, quizQuestions]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const legacyHistory = readStorage<HistoryItem[]>("ace-cbt-history-v1", []);
      const legacyWrong = readStorage<string[]>("ace-cbt-wrong-v1", []);
      setHistory(readStorage<HistoryItem[]>(HISTORY_KEY, legacyHistory));
      setWrongIds(readStorage<string[]>(WRONG_KEY, legacyWrong));
      setWrongNotes(readStorage<Record<string, string>>(WRONG_NOTES_KEY, {}));
      setExcludedIds(readStorage<string[]>(EXCLUDED_KEY, []));
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (screen !== "quiz" || showSubmit) return;

    const timer = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, showSubmit]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  const launchQuiz = (selected: Question[], title: string) => {
    if (selected.length === 0) {
      setMessage("풀 수 있는 문제가 없습니다. 제외한 문제를 다시 포함해 주세요.");
      setScreen("units");
      return;
    }

    setQuizQuestions(selected);
    setQuizTitle(title);
    setAnswers({});
    setCurrent(0);
    setTimeLeft(Math.max(2 * 60, selected.length * 90));
    setShowSubmit(false);
    setRevealedIds([]);
    setNoteOpenId(null);
    setScreen("quiz");
  };

  const startQuiz = (unit?: string, excludeId?: string) => {
    let selected = activeQuestions;
    if (unit) {
      selected = selected.filter((question) => question.unit === unit);
    }
    if (excludeId) {
      selected = selected.filter((question) => question.id !== excludeId);
    }
    launchQuiz(selected, unit ? `${unit} 단원` : "전체 문제");
  };

  const startSingleQuestion = (id: string) => {
    const question = questions.find((item) => item.id === id);
    if (!question) return;
    if (excludedIds.includes(id)) {
      setMessage("제외한 문제입니다. 먼저 다시 포함해 주세요.");
      return;
    }
    launchQuiz([question], `${question.unit} 오답 다시 풀기`);
  };

  const submitQuiz = () => {
    const attemptedIds = quizQuestions.map((question) => question.id);
    const wrong = result.wrong.map((question) => question.id);
    const previousUnattemptedWrong = wrongIds.filter(
      (id) => !attemptedIds.includes(id),
    );
    const nextWrong = Array.from(new Set([...previousUnattemptedWrong, ...wrong]));
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
        title: quizTitle,
      },
      ...history,
    ].slice(0, 6);

    setWrongIds(nextWrong);
    setHistory(nextHistory);
    writeStorage(WRONG_KEY, nextWrong);
    writeStorage(HISTORY_KEY, nextHistory);
    setShowSubmit(false);
    setScreen("result");
  };

  const moveScreen = (key: string) => {
    if (key === "home") setScreen("home");
    if (key === "units") setScreen("units");
    if (key === "review") setScreen("review");
  };

  const toggleBookmark = (id: string) => {
    setBookmarks((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  };

  const toggleAnswer = (id: string) => {
    setRevealedIds((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  };

  const changeWrongNote = (id: string, note: string) => {
    setWrongNotes((items) => ({ ...items, [id]: note }));
  };

  const saveWrongNote = (id: string) => {
    writeStorage(WRONG_NOTES_KEY, wrongNotes);
    setMessage(wrongNotes[id]?.trim() ? "오답노트를 저장했습니다." : "빈 오답노트를 저장했습니다.");
  };

  const toggleExcluded = (id: string) => {
    const isExcluded = excludedIds.includes(id);
    const nextExcluded = isExcluded
      ? excludedIds.filter((item) => item !== id)
      : [...excludedIds, id];
    setExcludedIds(nextExcluded);
    writeStorage(EXCLUDED_KEY, nextExcluded);
    setMessage(
      isExcluded
        ? "문제를 다시 풀이 목록에 포함했습니다."
        : "앞으로 문제 풀이에서 제외합니다.",
    );
  };

  const restoreExcluded = () => {
    setExcludedIds([]);
    writeStorage(EXCLUDED_KEY, []);
    setMessage("제외했던 문제를 모두 다시 포함했습니다.");
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
              (item.key === "units" &&
                (screen === "units" || screen === "quiz" || screen === "result")) ||
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
          <strong>바로 학습하기</strong>
          <p>전체 또는 단원별로 문제를 선택할 수 있어요.</p>
          <button onClick={() => setScreen("units")}>문제 선택 →</button>
        </div>

        <div className="profile">
          <span className="avatar">학</span>
          <span>
            <strong>나의 학습 공간</strong>
            <small>브라우저 저장 모드</small>
          </span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="mobile-brand">ACE STUDY</span>
            <p className="breadcrumb">
              {screen === "home" && "학습 홈"}
              {screen === "units" && "문제 풀이 · 단원 선택"}
              {screen === "quiz" && quizTitle}
              {screen === "result" && "학습 결과"}
              {screen === "review" && "오답노트"}
            </p>
          </div>
          <span className="offline-chip">
            <i /> 내 기기에 자동 저장
          </span>
        </header>

        {screen === "home" && (
          <Dashboard
            history={history}
            wrongCount={wrongIds.length}
            availableCount={activeQuestions.length}
            onStart={() => setScreen("units")}
            onReview={() => setScreen("review")}
          />
        )}

        {screen === "units" && (
          <UnitSelection
            excludedIds={excludedIds}
            onStartAll={() => startQuiz()}
            onStartUnit={(unit) => startQuiz(unit)}
            onRestoreExcluded={restoreExcluded}
          />
        )}

        {screen === "quiz" && currentQuestion && (
          <QuizScreen
            title={quizTitle}
            question={currentQuestion}
            quizQuestions={quizQuestions}
            current={current}
            answers={answers}
            bookmarks={bookmarks}
            timeLeft={timeLeft}
            answeredCount={answeredCount}
            isAnswerVisible={revealedIds.includes(currentQuestion.id)}
            isNoteOpen={noteOpenId === currentQuestion.id}
            wrongNote={wrongNotes[currentQuestion.id] ?? ""}
            onAnswer={(choice) =>
              setAnswers((items) => ({
                ...items,
                [currentQuestion.id]: choice,
              }))
            }
            onMove={(index) => {
              setCurrent(index);
              setNoteOpenId(null);
            }}
            onBookmark={() => toggleBookmark(currentQuestion.id)}
            onToggleAnswer={() => toggleAnswer(currentQuestion.id)}
            onToggleNote={() =>
              setNoteOpenId((id) => (id === currentQuestion.id ? null : currentQuestion.id))
            }
            onNoteChange={(note) => changeWrongNote(currentQuestion.id, note)}
            onSaveNote={() => saveWrongNote(currentQuestion.id)}
            onSubmit={() => setShowSubmit(true)}
            onExit={() => setScreen("units")}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            answers={answers}
            result={result}
            resultQuestions={quizQuestions}
            wrongNotes={wrongNotes}
            excludedIds={excludedIds}
            onHome={() => setScreen("home")}
            onRetry={() => launchQuiz(quizQuestions.filter((question) => !excludedIds.includes(question.id)), quizTitle)}
            onReview={() => setScreen("review")}
            onRelated={(unit, id) => startQuiz(unit, id)}
            onToggleExcluded={toggleExcluded}
          />
        )}

        {screen === "review" && (
          <ReviewScreen
            wrongIds={wrongIds}
            wrongNotes={wrongNotes}
            excludedIds={excludedIds}
            onStart={() => startQuiz()}
            onHome={() => setScreen("home")}
            onStartQuestion={startSingleQuestion}
            onNoteChange={changeWrongNote}
            onSaveNote={saveWrongNote}
            onToggleExcluded={toggleExcluded}
          />
        )}
      </main>

      {isSubmitOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <span className="modal-icon">✓</span>
            <p className="eyebrow">답안 제출 확인</p>
            <h2 id="submit-title">학습을 마칠까요?</h2>
            <p>
              총 {quizQuestions.length}문제 중 <strong>{answeredCount}문제</strong>에
              답했습니다. 미응답 {quizQuestions.length - answeredCount}문제는 오답으로
              처리됩니다.
            </p>
            <div className="modal-summary">
              <span>
                응답 완료 <strong>{answeredCount}</strong>
              </span>
              <span>
                미응답 <strong>{quizQuestions.length - answeredCount}</strong>
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

      {message && <div className="toast" role="status">{message}</div>}
    </div>
  );
}

function Dashboard({
  history,
  wrongCount,
  availableCount,
  onStart,
  onReview,
}: {
  history: HistoryItem[];
  wrongCount: number;
  availableCount: number;
  onStart: () => void;
  onReview: () => void;
}) {
  const latest = history[0];

  return (
    <div className="page dashboard-page">
      <section className="home-quiz-card">
        <div>
          <span className="hero-label">오늘의 학습</span>
          <h1>문제 풀기</h1>
          <p>전체 문제 또는 원하는 단원을 골라 바로 시작하세요.</p>
          <button className="button light home-start" onClick={onStart}>
            문제풀이 시작 <span>→</span>
          </button>
        </div>
        <div className="home-count" aria-label={`풀이 가능 문제 ${availableCount}개`}>
          <span>풀이 가능</span>
          <strong>{availableCount}</strong>
          <small>문제</small>
        </div>
      </section>

      <section className="stat-grid" aria-label="학습 현황">
        <article className="stat-card">
          <span className="stat-icon mint">✓</span>
          <div>
            <p>최근 점수</p>
            <strong>{latest ? `${latest.score}점` : "—"}</strong>
            <small>{latest ? `${latest.correct}/${latest.total} 정답` : "첫 문제를 풀어보세요"}</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">▤</span>
          <div>
            <p>누적 학습</p>
            <strong>{history.length}회</strong>
            <small>최근 6회 기록</small>
          </div>
        </article>
        <button className="stat-card clickable" onClick={onReview}>
          <span className="stat-icon peach">!</span>
          <span className="stat-copy">
            <span>내 오답노트</span>
            <strong>{wrongCount}개</strong>
            <small>확인하고 다시 풀기</small>
          </span>
          <span className="card-arrow">→</span>
        </button>
      </section>

      {latest && (
        <section className="recent-strip">
          <span>최근 학습</span>
          <strong>{latest.title ?? "전체 문제"}</strong>
          <small>{latest.date}</small>
          <b>{latest.score}점</b>
        </section>
      )}
    </div>
  );
}

function UnitSelection({
  excludedIds,
  onStartAll,
  onStartUnit,
  onRestoreExcluded,
}: {
  excludedIds: string[];
  onStartAll: () => void;
  onStartUnit: (unit: string) => void;
  onRestoreExcluded: () => void;
}) {
  const availableTotal = questions.length - excludedIds.length;

  return (
    <div className="page units-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">CHOOSE A UNIT</p>
          <h1>어떤 문제를 풀까요?</h1>
          <p>전체 문제 또는 단원별 문제를 선택할 수 있습니다.</p>
        </div>
        {excludedIds.length > 0 && (
          <button className="text-action" onClick={onRestoreExcluded}>
            제외한 {excludedIds.length}문제 다시 포함
          </button>
        )}
      </section>

      <button className="all-quiz-card" onClick={onStartAll} disabled={availableTotal === 0}>
        <span className="all-icon">A</span>
        <span>
          <small>전체 학습</small>
          <strong>모든 단원 문제 풀기</strong>
          <em>{availableTotal}문제 · 자동 채점</em>
        </span>
        <b>시작 →</b>
      </button>

      <section className="unit-grid" aria-label="단원 목록">
        {units.map((unit, index) => {
          const total = questions.filter((question) => question.unit === unit).length;
          const excluded = questions.filter(
            (question) => question.unit === unit && excludedIds.includes(question.id),
          ).length;
          const available = total - excluded;
          return (
            <article className="unit-card" key={unit}>
              <span className={`unit-number color-${index + 1}`}>{index + 1}</span>
              <div>
                <small>UNIT {String(index + 1).padStart(2, "0")}</small>
                <h2>{unit}</h2>
                <p>{available}문제{excluded > 0 ? ` · ${excluded}문제 제외됨` : ""}</p>
              </div>
              <button
                className="button primary"
                onClick={() => onStartUnit(unit)}
                disabled={available === 0}
              >
                단원 풀기
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function QuizScreen({
  title,
  question,
  quizQuestions,
  current,
  answers,
  bookmarks,
  timeLeft,
  answeredCount,
  isAnswerVisible,
  isNoteOpen,
  wrongNote,
  onAnswer,
  onMove,
  onBookmark,
  onToggleAnswer,
  onToggleNote,
  onNoteChange,
  onSaveNote,
  onSubmit,
  onExit,
}: {
  title: string;
  question: Question;
  quizQuestions: Question[];
  current: number;
  answers: Record<string, number>;
  bookmarks: string[];
  timeLeft: number;
  answeredCount: number;
  isAnswerVisible: boolean;
  isNoteOpen: boolean;
  wrongNote: string;
  onAnswer: (choice: number) => void;
  onMove: (index: number) => void;
  onBookmark: () => void;
  onToggleAnswer: () => void;
  onToggleNote: () => void;
  onNoteChange: (note: string) => void;
  onSaveNote: () => void;
  onSubmit: () => void;
  onExit: () => void;
}) {
  return (
    <div className="page quiz-page">
      <section className="quiz-heading">
        <div>
          <p className="eyebrow">UNIT LEARNING</p>
          <h1>{title}</h1>
          <p>정답을 확인하거나 문제별 오답노트를 작성할 수 있습니다.</p>
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

          <div className="study-tools">
            <button className={isNoteOpen ? "active" : ""} onClick={onToggleNote}>
              ✎ 내 오답노트 {wrongNote.trim() ? "· 작성됨" : ""}
            </button>
            <button className={isAnswerVisible ? "active" : ""} onClick={onToggleAnswer}>
              {isAnswerVisible ? "정답 닫기" : "정답 보기"}
            </button>
          </div>

          {isNoteOpen && (
            <section className="note-editor">
              <label htmlFor={`note-${question.id}`}>이 문제에서 기억할 점</label>
              <textarea
                id={`note-${question.id}`}
                value={wrongNote}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="틀린 이유나 다음에 확인할 기준을 적어보세요."
              />
              <button className="button primary compact" onClick={onSaveNote}>
                오답노트 저장
              </button>
            </section>
          )}

          {isAnswerVisible && (
            <section className="answer-reveal" aria-live="polite">
              <span>정답 {question.answer + 1}번</span>
              <strong>{question.choices[question.answer]}</strong>
              <p>{question.shortExplanation}</p>
            </section>
          )}

          <h2>{question.question}</h2>
          <div className="choice-list">
            {question.choices.map((choice, index) => (
              <button
                className={`choice ${answers[question.id] === index ? "selected" : ""} ${
                  isAnswerVisible && index === question.answer ? "answer" : ""
                }`}
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
            {current < quizQuestions.length - 1 ? (
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
            <strong>{answeredCount}/{quizQuestions.length}</strong>
          </div>
          <div className="answer-progress">
            <i style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }} />
          </div>
          <div className="answer-grid">
            {quizQuestions.map((item, index) => (
              <button
                key={item.id}
                className={`${index === current ? "current" : ""} ${
                  answers[item.id] !== undefined ? "answered" : ""
                }`}
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
          <button className="exit-link" onClick={onExit}>단원 선택으로 나가기</button>
        </aside>
      </div>
    </div>
  );
}

function ResultScreen({
  answers,
  result,
  resultQuestions,
  wrongNotes,
  excludedIds,
  onHome,
  onRetry,
  onReview,
  onRelated,
  onToggleExcluded,
}: {
  answers: Record<string, number>;
  result: QuizResult;
  resultQuestions: Question[];
  wrongNotes: Record<string, string>;
  excludedIds: string[];
  onHome: () => void;
  onRetry: () => void;
  onReview: () => void;
  onRelated: (unit: string, id: string) => void;
  onToggleExcluded: (id: string) => void;
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
          <h1>{result.score >= 80 ? "핵심 개념을 잘 이해했어요." : "해설을 확인하고 관련 문제로 익혀보세요."}</h1>
          <div className="result-metrics">
            <span>정답 <strong>{result.correct}</strong></span>
            <span>오답·미응답 <strong>{result.total - result.correct}</strong></span>
            <span>총 문항 <strong>{result.total}</strong></span>
          </div>
          <div className="result-actions">
            <button className="button primary" onClick={onReview}>오답노트 보기</button>
            <button className="button secondary" onClick={onRetry}>같은 범위 다시 풀기</button>
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
          {resultQuestions.map((question, index) => {
            const isCorrect = answers[question.id] === question.answer;
            const isExcluded = excludedIds.includes(question.id);
            const relatedCount = questions.filter(
              (item) =>
                item.unit === question.unit &&
                item.id !== question.id &&
                !excludedIds.includes(item.id),
            ).length;
            return (
              <details
                className={`solution-item ${isCorrect ? "correct" : "wrong"}`}
                key={question.id}
                open={!isCorrect}
              >
                <summary>
                  <span className="result-mark">{isCorrect ? "✓" : "!"}</span>
                  <div>
                    <small>문제 {index + 1} · {question.unit}</small>
                    <strong>{question.question}</strong>
                  </div>
                  <span className="solution-status">{isCorrect ? "정답" : "오답"}</span>
                </summary>
                <div className="solution-body">
                  <div className="answer-comparison">
                    <p><b>내 답</b> {answers[question.id] !== undefined ? question.choices[answers[question.id]] : "미응답"}</p>
                    <p><b>정답</b> {question.choices[question.answer]}</p>
                  </div>

                  <div className="explanation simple">
                    <b>간단 해설</b>
                    <p>{question.shortExplanation}</p>
                  </div>
                  {!isCorrect && (
                    <div className="explanation detailed">
                      <b>자세한 해설</b>
                      <p>{question.detailedExplanation}</p>
                    </div>
                  )}

                  {wrongNotes[question.id]?.trim() && (
                    <div className="saved-note">
                      <b>내 오답노트</b>
                      <p>{wrongNotes[question.id]}</p>
                    </div>
                  )}

                  <div className="solution-actions">
                    <button
                      className="button primary"
                      onClick={() => onRelated(question.unit, question.id)}
                      disabled={relatedCount === 0}
                    >
                      관련 문제 더 풀어보기 {relatedCount > 0 ? `(${relatedCount})` : ""}
                    </button>
                    <button
                      className={`button ${isExcluded ? "restore" : "exclude"}`}
                      onClick={() => onToggleExcluded(question.id)}
                    >
                      {isExcluded ? "문제 풀이에 다시 포함" : "문제 풀이에서 제외"}
                    </button>
                  </div>
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
  wrongNotes,
  excludedIds,
  onStart,
  onHome,
  onStartQuestion,
  onNoteChange,
  onSaveNote,
  onToggleExcluded,
}: {
  wrongIds: string[];
  wrongNotes: Record<string, string>;
  excludedIds: string[];
  onStart: () => void;
  onHome: () => void;
  onStartQuestion: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSaveNote: (id: string) => void;
  onToggleExcluded: (id: string) => void;
}) {
  const wrongQuestions = questions.filter((question) => wrongIds.includes(question.id));

  return (
    <div className="page review-page">
      <section className="review-heading">
        <div>
          <p className="eyebrow">WRONG ANSWER NOTE</p>
          <h1>내 오답노트</h1>
          <p>틀린 이유를 기록하고 문제별로 다시 풀어보세요.</p>
        </div>
        <button className="button primary" onClick={onStart}>전체 문제 풀기</button>
      </section>

      {wrongQuestions.length === 0 ? (
        <section className="panel empty-review">
          <span>✓</span>
          <h2>저장된 오답이 없습니다.</h2>
          <p>문제를 풀면 틀린 문항이 자동으로 모입니다.</p>
          <div>
            <button className="button primary" onClick={onStart}>문제 풀기</button>
            <button className="button secondary" onClick={onHome}>학습 홈</button>
          </div>
        </section>
      ) : (
        <section className="review-list">
          {wrongQuestions.map((question, index) => {
            const isExcluded = excludedIds.includes(question.id);
            return (
              <article className="panel review-card" key={question.id}>
                <div className="review-number">{index + 1}</div>
                <div className="review-content">
                  <p className="review-meta">{question.subject} · {question.unit}</p>
                  <h2>{question.question}</h2>
                  <div className="review-answer">
                    <span>정답</span>{question.choices[question.answer]}
                  </div>
                  <div className="review-explanation">
                    <span>해설</span><p>{question.detailedExplanation}</p>
                  </div>
                  <label className="review-note-label" htmlFor={`review-note-${question.id}`}>
                    내가 작성한 오답노트
                  </label>
                  <textarea
                    id={`review-note-${question.id}`}
                    className="review-note"
                    value={wrongNotes[question.id] ?? ""}
                    onChange={(event) => onNoteChange(question.id, event.target.value)}
                    placeholder="틀린 이유나 기억할 점을 적어보세요."
                  />
                  <div className="review-actions">
                    <button className="button secondary" onClick={() => onSaveNote(question.id)}>
                      노트 저장
                    </button>
                    <button
                      className="button primary"
                      onClick={() => onStartQuestion(question.id)}
                      disabled={isExcluded}
                    >
                      {isExcluded ? "풀이에서 제외됨" : "이 문제 다시 풀기"}
                    </button>
                    {isExcluded && (
                      <button className="text-action" onClick={() => onToggleExcluded(question.id)}>
                        다시 포함하기
                      </button>
                    )}
                  </div>
                </div>
                <span className="demo-badge">학습문제</span>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
