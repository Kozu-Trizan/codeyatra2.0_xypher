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
      const res = await authFetch("/api/concepts");
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
      const q = data?.data?.questions ?? data?.questions ?? [];
      setQuestions(q);
      setScreen(S.QUIZ);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  function handleChoose(choiceId) {
    const qId = questions[step]?.id;
    setAnswers((prev) => ({ ...prev, [qId]: choiceId }));
    setShowHint(false);
  }

  async function handleNext() {
    if (step < questions.length - 1) { setStep((s) => s + 1); setShowHint(false); return; }
    setScreen(S.SUBMITTING);
    const payload = {
      concept_id: concept.id,
      answers: Object.entries(answers).map(([question_id, choice_id]) => ({ question_id, choice_id })),
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
    const chosen = answers[q?.id];
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

        {/* Problem statement (if q has context) */}
        {q?.context && (
          <div className="rounded-xl bg-amber-brand/5 border border-amber-200 px-5 py-3 mb-5 text-sm text-text-primary">
            <span className="font-semibold">Problem: </span>{q.context}
          </div>
        )}

        {/* Question */}
        <div className="mb-2">
          <h3 className="text-lg font-bold text-text-primary">
            Step {step + 1} of {questions.length}
          </h3>
          <p className="text-text-secondary text-sm mt-1 leading-relaxed">{q?.text}</p>
        </div>

        {/* Given info */}
        {q?.given && (
          <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-2.5 mb-5 text-sm text-text-secondary">
            {q.given}
          </div>
        )}

        {/* Choices */}
        <div className="flex flex-col gap-3 mb-6">
          {q?.choices?.map((ch) => (
            <button
              key={ch.id}
              onClick={() => handleChoose(ch.id)}
              className={`group rounded-xl border-2 px-5 py-4 text-sm text-left transition-all flex items-center gap-4 ${
                chosen === ch.id
                  ? "border-amber-brand bg-amber-brand/10 shadow-sm shadow-amber-brand/10"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                chosen === ch.id
                  ? "border-amber-brand bg-amber-brand"
                  : "border-gray-300 bg-white group-hover:border-gray-400"
              }`}>
                {chosen === ch.id && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`${chosen === ch.id ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                {ch.text}
              </span>
            </button>
          ))}
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
            disabled={!chosen}
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
    const passed = results.pass ?? !results.needs_bridge;
    const prereqs = results.mapped_prereqs ?? [];
    const checkpoints = results.results ?? [];
    const correctCount = checkpoints.filter((c) => c.correct).length;
    const score = Math.round((correctCount / (checkpoints.length || 1)) * 100);
    const xpEarned = correctCount * 30 + (passed ? 50 : 0);

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
              <p className="text-2xl font-extrabold text-text-primary">{correctCount}/{checkpoints.length}</p>
              <p className="text-[11px] text-text-muted">Correct</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-amber-brand">+{xpEarned}</p>
              <p className="text-[11px] text-text-muted">XP Earned</p>
            </div>
          </div>
        </div>

        {/* Checkpoint breakdown */}
        {checkpoints.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
            <h3 className="font-bold text-sm text-text-primary mb-4 flex items-center gap-2">
              <span>📋</span> Checkpoint Results
            </h3>
            <div className="flex flex-col gap-2.5">
              {checkpoints.map((r, i) => (
                <div key={r.checkpoint_id ?? i} className={`flex items-center gap-3 rounded-xl p-3 ${
                  r.correct ? "bg-emerald-50" : "bg-red-50"
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    r.correct ? "bg-emerald-400 text-white" : "bg-red-400 text-white"
                  }`}>
                    {r.correct ? "✓" : "✗"}
                  </div>
                  <span className="text-sm text-text-primary font-medium">Step {i + 1}</span>
                  {!r.correct && r.mapped_prereq && (
                    <span className="ml-auto text-[11px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-semibold">
                      Review: {PREREQ_LABELS[r.mapped_prereq] ?? r.mapped_prereq}
                    </span>
                  )}
                  {r.correct && (
                    <span className="ml-auto text-[11px] text-emerald-600 font-semibold">+30 XP</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisite bridge */}
        {prereqs.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-brand/5 p-6 mb-5">
            <h3 className="font-bold text-sm text-amber-700 mb-3 flex items-center gap-2">
              <span>🗺️</span> Prerequisite Bridge
            </h3>
            <p className="text-text-secondary text-xs mb-4">Study these topics first, then re-attempt the mission.</p>
            <div className="flex flex-wrap gap-2">
              {prereqs.map((p) => (
                <span key={p} className="rounded-xl border border-amber-300 bg-amber-100 text-amber-800 text-sm px-3.5 py-1.5 font-semibold">
                  {PREREQ_LABELS[p] ?? p}
                </span>
              ))}
            </div>
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
