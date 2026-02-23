import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const S = {
  LOADING_CONCEPTS: "loading_concepts",
  PICK_CONCEPT: "pick_concept",
  LOADING_QUESTIONS: "loading_questions",
  QUIZ: "quiz",
  SUBMITTING: "submitting",
  RESULTS: "results",
  ERROR: "error",
};

const PREREQ_LABELS = {
  vectors_components: "Vector Components",
  trigonometry: "Trigonometry",
  angular_kinematics: "Angular Kinematics",
  newtons_laws: "Newton's Laws",
  energy_work: "Work & Energy",
  calculus_basics: "Basic Calculus",
};

export default function DiagnosePage() {
  const { authFetch } = useAuth();

  const [screen, setScreen] = useState(S.LOADING_CONCEPTS);
  const [concepts, setConcepts] = useState([]);
  const [concept, setConcept] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [resources, setResources] = useState([]);
  const [errMsg, setErrMsg] = useState("");
  const [showHint, setShowHint] = useState(false);

  const loadConcepts = useCallback(async () => {
    setScreen(S.LOADING_CONCEPTS);
    try {
      const res = await authFetch("/api/concepts?syllabus_only=true&include_prerequisites=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to load concepts.");
      const list = data?.data?.concepts ?? data ?? [];
      setConcepts(Array.isArray(list) ? list : []);
      setScreen(S.PICK_CONCEPT);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }, [authFetch]);

  useEffect(() => { loadConcepts(); }, [loadConcepts]);

  async function handlePickConcept(c) {
    setConcept(c);
    setScreen(S.LOADING_QUESTIONS);
    setAnswers({});
    setStep(0);
    setShowHint(false);
    try {
      const res = await authFetch("/api/diagnose", { method: "POST", body: JSON.stringify({ concept_id: c.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to generate questions.");
      const payload = data?.data ?? data;
      setSessionId(payload.session_id);
      const q = payload.questions ?? [];
      setQuestions(q);
      setScreen(S.QUIZ);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  function handleAnswer(value) {
    const qId = questions[step]?.id;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function handleNext() {
    if (step < questions.length - 1) { setStep((s) => s + 1); setShowHint(false); return; }
    setScreen(S.SUBMITTING);
    const payload = {
      session_id: sessionId,
      answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id: Number(question_id), answer })),
    };
    try {
      const [evalRes, resRes] = await Promise.all([
        authFetch("/api/diagnose/evaluate", { method: "POST", body: JSON.stringify(payload) }),
        authFetch(`/api/resources/${concept.id}`),
      ]);
      const [evalData, resData] = await Promise.all([evalRes.json(), resRes.json()]);
      if (!evalRes.ok) throw new Error(evalData.error?.message ?? "Evaluation failed.");
      setResults(evalData?.data ?? evalData);
      setResources(resData?.data?.resources ?? resData?.resources ?? []);
      setScreen(S.RESULTS);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  function restart() {
    setConcept(null); setQuestions([]); setAnswers({}); setResults(null);
    setResources([]); setStep(0); setShowHint(false); loadConcepts();
  }

  /* ── LOADING SCREENS ── */
  if (screen === S.LOADING_CONCEPTS || screen === S.LOADING_QUESTIONS || screen === S.SUBMITTING) {
    const msgs = {
      [S.LOADING_CONCEPTS]: { text: "Preparing missions…", emoji: "📡" },
      [S.LOADING_QUESTIONS]: { text: "Generating your diagnostic…", emoji: "🧬" },
      [S.SUBMITTING]: { text: "Evaluating your answers…", emoji: "⚡" },
    };
    const m = msgs[screen];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">{m.emoji}</span>
        </div>
        <p className="text-text-secondary text-sm animate-pulse">{m.text}</p>
      </div>
    );
  }

  /* ── ERROR ── */
  if (screen === S.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl">💥</div>
        <p className="text-red-600 font-bold">{errMsg}</p>
        <p className="text-text-muted text-sm">
          Make sure the backend is running on <code className="text-amber-brand font-mono">localhost:5001</code>
        </p>
        <button onClick={restart} className="mt-2 rounded-xl border border-gray-200 hover:border-amber-brand px-6 py-2.5 text-sm font-semibold text-text-secondary hover:text-amber-700 transition-all">
          Try Again
        </button>
      </div>
    );
  }

  /* ── PICK CONCEPT ── */
  if (screen === S.PICK_CONCEPT) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-amber-brand/15 flex items-center justify-center text-xl">🎯</div>
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">Choose Your Mission</h2>
            <p className="text-text-secondary text-sm">Pick the concept you want to diagnose. We'll run a quick checkpoint quiz.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => handlePickConcept(c)}
              className="group rounded-2xl border-2 border-gray-200 bg-white hover:border-amber-brand hover:shadow-md hover:shadow-amber-brand/5 p-5 text-left transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-text-primary group-hover:text-amber-700 transition-colors">
                  {c.name}
                </span>
                <span className="text-[10px] font-bold bg-cream-200 text-text-muted px-2 py-0.5 rounded-full">
                  +100 XP
                </span>
              </div>
              {c.description && (
                <p className="text-text-secondary text-xs line-clamp-2 mb-3">{c.description}</p>
              )}
              {c.prerequisites?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.prerequisites.map((p) => (
                    <span key={p} className="text-[10px] bg-amber-brand/10 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                      {PREREQ_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </main>
    );
  }

  /* ── QUIZ ── */
  if (screen === S.QUIZ) {
    const q = questions[step];
    const currentAnswer = answers[q?.id] ?? "";
    const isLast = step === questions.length - 1;

    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Mission header card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">
              {concept?.name} Detective
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Chapter: {concept?.name}
            </p>
          </div>
          <span className="text-3xl">🐥</span>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-0 mb-8">
          {questions.map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step
                  ? "bg-emerald-400 text-white"
                  : i === step
                    ? "bg-amber-brand text-white shadow-md shadow-amber-brand/30 scale-110"
                    : "bg-gray-100 text-text-muted"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < questions.length - 1 && (
                <div className={`w-10 h-0.5 ${i < step ? "bg-emerald-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Question */}
        <div className="mb-2">
          <h3 className="text-lg font-bold text-text-primary">
            Step {step + 1} of {questions.length}
          </h3>
          <p className="text-text-secondary text-sm mt-1 leading-relaxed">{q?.question_text}</p>
        </div>

        {/* Difficulty badge */}
        {q?.difficulty && (
          <div className="mb-5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              q.difficulty <= 2 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : q.difficulty <= 3 ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-rose-100 text-rose-700 border-rose-200"
            }`}>
              Difficulty: {q.difficulty}/5
            </span>
          </div>
        )}

        {/* Text input answer */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
            Your Answer
          </label>
          <input
            type="text"
            value={currentAnswer}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Type your answer here…"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/30 focus:border-amber-brand transition-all placeholder:text-text-muted"
            onKeyDown={(e) => { if (e.key === "Enter" && currentAnswer.trim()) handleNext(); }}
          />
        </div>

        {/* Hint */}
        <div className="mb-6">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-text-muted hover:text-amber-700 flex items-center gap-1.5 transition-colors"
          >
            <span>💡</span> {showHint ? "Hide hint" : "Need a hint?"}
          </button>
          {showHint && (
            <div className="mt-2 rounded-xl bg-amber-brand/5 border border-amber-200 px-4 py-3 text-xs text-text-secondary animate-in">
              Think about the fundamental relationships. Which formula directly applies to the given values?
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          {step > 0 ? (
            <button onClick={() => { setStep((s) => s - 1); setShowHint(false); }}
              className="rounded-xl border border-gray-200 hover:border-gray-300 px-6 py-2.5 text-sm font-semibold text-text-secondary transition-all">
              ← Back
            </button>
          ) : <div />}
          <button
            disabled={!currentAnswer.trim()}
            onClick={handleNext}
            className="rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 px-8 py-2.5 text-sm font-bold text-white transition-all shadow-sm shadow-amber-brand/20"
          >
            {isLast ? "Submit Answers 🚀" : "Next →"}
          </button>
        </div>
      </main>
    );
  }

  /* ── RESULTS ── */
  if (screen === S.RESULTS && results) {
    const passed = results.result === "pass";
    const correctCount = results.correct_count ?? 0;
    const totalCount = results.total_count ?? 1;
    const score = Math.round((results.score ?? 0) * 100);
    const xpEarned = correctCount * 30 + (passed ? 50 : 0);
    const feedbackList = results.feedback ?? [];

    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Result hero */}
        <div className={`rounded-2xl border-2 p-8 mb-6 text-center ${
          passed ? "border-emerald-300 bg-gradient-to-b from-emerald-50 to-white" : "border-amber-300 bg-gradient-to-b from-amber-50 to-white"
        }`}>
          <div className="text-5xl mb-3">{passed ? "🎉" : "🔍"}</div>
          <h2 className="text-2xl font-extrabold text-text-primary mb-1">
            {passed ? "Mission Complete!" : "Gap Detected!"}
          </h2>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-4">
            {passed
              ? `You've mastered ${concept?.name}. Keep exploring!`
              : `We found some areas to improve before mastering ${concept?.name}.`}
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className={`text-2xl font-extrabold ${passed ? "text-emerald-600" : "text-amber-600"}`}>{score}%</p>
              <p className="text-[11px] text-text-muted">Score</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-text-primary">{correctCount}/{totalCount}</p>
              <p className="text-[11px] text-text-muted">Correct</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-amber-brand">+{xpEarned}</p>
              <p className="text-[11px] text-text-muted">XP Earned</p>
            </div>
          </div>
        </div>

        {/* Question-by-question feedback */}
        {feedbackList.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
            <h3 className="font-bold text-sm text-text-primary mb-4 flex items-center gap-2">
              <span>📋</span> Question Results
            </h3>
            <div className="flex flex-col gap-2.5">
              {feedbackList.map((f, i) => (
                <div key={f.question_id ?? i} className={`flex items-center gap-3 rounded-xl p-3 ${
                  f.is_correct ? "bg-emerald-50" : "bg-red-50"
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    f.is_correct ? "bg-emerald-400 text-white" : "bg-red-400 text-white"
                  }`}>
                    {f.is_correct ? "✓" : "✗"}
                  </div>
                  <span className="text-sm text-text-primary font-medium flex-1">
                    {f.feedback}
                  </span>
                  {f.is_correct && (
                    <span className="text-[11px] text-emerald-600 font-semibold">+30 XP</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concept status */}
        {results.concept_status && (
          <div className={`rounded-2xl border p-5 mb-5 ${
            results.concept_status === "mastered"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-brand/5"
          }`}>
            <h3 className={`font-bold text-sm mb-2 flex items-center gap-2 ${
              results.concept_status === "mastered" ? "text-emerald-700" : "text-amber-700"
            }`}>
              <span>{results.concept_status === "mastered" ? "🏅" : "🗺️"}</span>
              {results.concept_status === "mastered" ? "Concept Mastered!" : "Keep Practicing"}
            </h3>
            <p className="text-text-secondary text-xs">
              {results.concept_status === "mastered"
                ? "Great work! This concept is now marked as mastered in your progress."
                : "Review the resources below and try again to master this concept."}
            </p>
          </div>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
            <h3 className="font-bold text-sm text-text-primary mb-4 flex items-center gap-2">
              <span>📹</span> Curated Resources
            </h3>
            <div className="flex flex-col gap-2.5">
              {resources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-amber-brand bg-cream-50 hover:bg-cream-100 p-4 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 text-sm group-hover:bg-red-100 transition-colors">
                    ▶
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{r.title}</p>
                    {r.timestamp && <p className="text-[11px] text-text-muted">Start at {r.timestamp}</p>}
                  </div>
                  <span className="text-text-muted text-xs shrink-0">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={restart}
            className="flex-1 rounded-xl border-2 border-gray-200 hover:border-amber-brand py-3 text-sm font-bold text-text-secondary hover:text-amber-700 transition-all">
            ← Choose Another Mission
          </button>
          <button onClick={() => handlePickConcept(concept)}
            className="flex-1 rounded-xl bg-amber-brand hover:bg-amber-hover active:scale-95 py-3 text-sm font-bold text-white transition-all shadow-sm shadow-amber-brand/20">
            Retry Mission ↺
          </button>
        </div>
      </main>
    );
  }

  return null;
}
