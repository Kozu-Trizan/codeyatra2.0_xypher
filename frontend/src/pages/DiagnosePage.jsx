import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

// ── UI states ────────────────────────────────────────────────────────────────
const S = {
  LOADING_CONCEPTS: "loading_concepts",
  PICK_CONCEPT: "pick_concept",
  LOADING_QUESTIONS: "loading_questions",
  QUIZ: "quiz",
  SUBMITTING: "submitting",
  RESULTS: "results",
  ERROR: "error",
};

// ── Prereq labels ────────────────────────────────────────────────────────────
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
  const [concept, setConcept] = useState(null); // chosen concept object
  const [questions, setQuestions] = useState([]); // [{id, text, choices:[{id,text}]}]
  const [step, setStep] = useState(0); // current question index
  const [answers, setAnswers] = useState({}); // { question_id: choice_id }
  const [results, setResults] = useState(null); // evaluate response
  const [resources, setResources] = useState([]); // [{title,url,timestamp}]
  const [errMsg, setErrMsg] = useState("");

  // ── 1. Load concepts ───────────────────────────────────────────────────────
  const loadConcepts = useCallback(async () => {
    setScreen(S.LOADING_CONCEPTS);
    try {
      const res = await authFetch("/api/concepts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to load concepts.");
      setConcepts(data);
      setScreen(S.PICK_CONCEPT);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }, [authFetch]);

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  // ── 2. Pick a concept → fetch questions ───────────────────────────────────
  async function handlePickConcept(c) {
    setConcept(c);
    setScreen(S.LOADING_QUESTIONS);
    setAnswers({});
    setStep(0);
    try {
      const res = await authFetch("/api/diagnose", {
        method: "POST",
        body: JSON.stringify({ concept_id: c.id }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message ?? "Failed to generate questions.");
      setQuestions(data.questions ?? []);
      setScreen(S.QUIZ);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  // ── 3. Answer a checkpoint ─────────────────────────────────────────────────
  function handleChoose(choiceId) {
    const qId = questions[step]?.id;
    setAnswers((prev) => ({ ...prev, [qId]: choiceId }));
  }

  // ── 4. Next / submit ───────────────────────────────────────────────────────
  async function handleNext() {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Last question — submit
    setScreen(S.SUBMITTING);
    const payload = {
      concept_id: concept.id,
      answers: Object.entries(answers).map(([question_id, choice_id]) => ({
        question_id,
        choice_id,
      })),
    };
    try {
      const [evalRes, resRes] = await Promise.all([
        authFetch("/api/diagnose/evaluate", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        authFetch(`/api/resources/${concept.id}`),
      ]);
      const [evalData, resData] = await Promise.all([
        evalRes.json(),
        resRes.json(),
      ]);
      if (!evalRes.ok)
        throw new Error(evalData.message ?? "Evaluation failed.");
      setResults(evalData);
      setResources(resData.resources ?? []);
      setScreen(S.RESULTS);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  function restart() {
    setConcept(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setResources([]);
    setStep(0);
    loadConcepts();
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (
    screen === S.LOADING_CONCEPTS ||
    screen === S.LOADING_QUESTIONS ||
    screen === S.SUBMITTING
  ) {
    const msgs = {
      [S.LOADING_CONCEPTS]: "Loading concepts…",
      [S.LOADING_QUESTIONS]: "Generating your diagnostic questions…",
      [S.SUBMITTING]: "Evaluating your answers…",
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">{msgs[screen]}</p>
      </div>
    );
  }

  if (screen === S.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-400 font-medium">{errMsg}</p>
        <p className="text-slate-500 text-sm">
          Make sure the Flask backend is running on{" "}
          <code className="text-indigo-400">localhost:5000</code>
        </p>
        <button
          onClick={restart}
          className="mt-2 rounded-xl border border-slate-700 hover:border-slate-500 px-6 py-2 text-sm font-medium text-slate-300 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── PICK CONCEPT ──────────────────────────────────────────────────────────
  if (screen === S.PICK_CONCEPT) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-1">Choose a Concept</h2>
        <p className="text-slate-400 text-sm mb-8">
          Pick the concept you&apos;re stuck on. We&apos;ll run 3 diagnostic
          questions to find your exact gap.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => handlePickConcept(c)}
              className="group rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-600/60 hover:bg-slate-800/60 p-5 text-left transition-all"
            >
              <div className="font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                {c.name}
              </div>
              {c.description && (
                <div className="text-slate-400 text-xs line-clamp-2">
                  {c.description}
                </div>
              )}
              {c.prerequisites?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.prerequisites.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 rounded px-1.5 py-0.5"
                    >
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

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen === S.QUIZ) {
    const q = questions[step];
    const chosen = answers[q?.id];
    const isLast = step === questions.length - 1;

    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
              {concept?.name}
            </p>
            <h2 className="text-lg font-bold text-white">
              Checkpoint {step + 1} of {questions.length}
            </h2>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-all ${
                  i < step
                    ? "bg-indigo-500"
                    : i === step
                      ? "bg-indigo-400"
                      : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 mb-6">
          <p className="text-white text-base leading-relaxed mb-6">{q?.text}</p>

          <div className="flex flex-col gap-3">
            {q?.choices?.map((ch) => (
              <button
                key={ch.id}
                onClick={() => handleChoose(ch.id)}
                className={`rounded-xl border-2 px-5 py-3.5 text-sm text-left transition-all ${
                  chosen === ch.id
                    ? "border-indigo-500 bg-indigo-950/60 text-white"
                    : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span
                  className={`font-mono mr-3 text-xs ${chosen === ch.id ? "text-indigo-400" : "text-slate-500"}`}
                >
                  {ch.id.toUpperCase()}.
                </span>
                {ch.text}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-700 hover:border-slate-500 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            disabled={!chosen}
            onClick={handleNext}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 px-8 py-2.5 text-sm font-semibold text-white transition-all"
          >
            {isLast ? "Submit →" : "Next →"}
          </button>
        </div>
      </main>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (screen === S.RESULTS && results) {
    const passed = results.pass ?? !results.needs_bridge;
    const prereqs = results.mapped_prereqs ?? [];
    const checkpoints = results.results ?? [];

    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Result banner */}
        <div
          className={`rounded-2xl border p-7 mb-6 text-center ${
            passed
              ? "border-emerald-700/50 bg-emerald-950/30"
              : "border-amber-700/50 bg-amber-950/20"
          }`}
        >
          <div className="text-5xl mb-3">{passed ? "🎉" : "🔍"}</div>
          <h2 className="text-2xl font-extrabold mb-2 text-white">
            {passed ? "Great job!" : "Gap detected"}
          </h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            {passed
              ? `You have a solid grasp of ${concept?.name}. Keep going!`
              : `You need to review some prerequisites before mastering ${concept?.name}.`}
          </p>
        </div>

        {/* Checkpoint breakdown */}
        {checkpoints.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6">
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-widest mb-4">
              Checkpoint Results
            </h3>
            <div className="flex flex-col gap-3">
              {checkpoints.map((r, i) => (
                <div
                  key={r.checkpoint_id ?? i}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      r.correct
                        ? "bg-emerald-900 text-emerald-400"
                        : "bg-red-900 text-red-400"
                    }`}
                  >
                    {r.correct ? "✓" : "✗"}
                  </div>
                  <span className="text-sm text-slate-300">
                    Checkpoint {i + 1}
                  </span>
                  {!r.correct && r.mapped_prereq && (
                    <span className="ml-auto text-[11px] bg-amber-950/50 text-amber-400 border border-amber-800/40 rounded px-2 py-0.5">
                      Review:{" "}
                      {PREREQ_LABELS[r.mapped_prereq] ?? r.mapped_prereq}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bridge — prerequisite nodes */}
        {prereqs.length > 0 && (
          <div className="rounded-2xl border border-indigo-800/40 bg-indigo-950/20 p-6 mb-6">
            <h3 className="font-semibold text-sm text-indigo-400 uppercase tracking-widest mb-3">
              🗺️ Prerequisite Bridge
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Study these topics first, then re-attempt the diagnostic.
            </p>
            <div className="flex flex-wrap gap-2">
              {prereqs.map((p) => (
                <span
                  key={p}
                  className="rounded-lg border border-indigo-700/50 bg-indigo-900/30 text-indigo-300 text-sm px-3 py-1.5 font-medium"
                >
                  {PREREQ_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6">
            <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-widest mb-4">
              📹 Curated Resources
            </h3>
            <div className="flex flex-col gap-3">
              {resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-slate-700 hover:border-indigo-600/60 bg-slate-800/60 hover:bg-slate-800 p-4 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-900/40 border border-red-800/30 flex items-center justify-center flex-shrink-0 text-sm">
                    ▶
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    {r.timestamp && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Start at {r.timestamp}
                      </p>
                    )}
                    {r.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {r.description}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 rounded-xl border border-slate-700 hover:border-slate-500 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-all"
          >
            ← Try Another Concept
          </button>
          <button
            onClick={() => handlePickConcept(concept)}
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 py-3 text-sm font-semibold text-white transition-all"
          >
            Retry This Concept ↺
          </button>
        </div>
      </main>
    );
  }

  return null;
}
