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
  const { authFetch, user } = useAuth();

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
    setSessionId(null);
    try {
      const res = await authFetch("/api/diagnose", {
        method: "POST",
        body: JSON.stringify({ concept_id: c.id, student_id: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to generate questions.");
      const q = data?.data?.questions ?? data?.questions ?? [];
      const sid = data?.data?.session_id ?? data?.session_id ?? null;
      setQuestions(q);
      setSessionId(sid);
      setScreen(S.QUIZ);
    } catch (e) {
      setErrMsg(e.message);
      setScreen(S.ERROR);
    }
  }

  function handleAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleNext() {
    if (step < questions.length - 1) { setStep((s) => s + 1); return; }
    setScreen(S.SUBMITTING);
    const payload = {
      session_id: sessionId,
      answers: Object.entries(answers).map(([question_id, answer]) => ({
        question_id: Number(question_id),
        answer,
      })),
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
    setResources([]); setStep(0); setSessionId(null); loadConcepts();
  }

  /* LOADING */
  if (screen === S.LOADING_CONCEPTS || screen === S.LOADING_QUESTIONS || screen === S.SUBMITTING) {
    const msg = {
      [S.LOADING_CONCEPTS]: "Preparing diagnostic sessions...",
      [S.LOADING_QUESTIONS]: "Generating your diagnostic...",
      [S.SUBMITTING]: "Evaluating your answers...",
    }[screen];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />
        <p className="text-text-secondary text-sm">{msg}</p>
      </div>
    );
  }

  /* ERROR */
  if (screen === S.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="text-red-600 font-bold text-lg">{errMsg}</p>
          <p className="text-text-muted text-sm mt-1">
            Make sure the backend is running on{" "}
            <code className="text-amber-brand font-mono">localhost:5001</code>
          </p>
        </div>
        <button onClick={restart} className="rounded-xl border border-gray-200 hover:border-amber-brand px-6 py-2.5 text-sm font-semibold text-text-secondary hover:text-amber-700 transition-all">
          Try Again
        </button>
      </div>
    );
  }

  /* PICK CONCEPT */
  if (screen === S.PICK_CONCEPT) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">Diagnostic Sessions</h2>
          <p className="text-text-secondary text-sm mt-1">Select a concept to begin your diagnostic assessment.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => handlePickConcept(c)}
              className="group rounded-2xl border-2 border-gray-200 bg-white hover:border-amber-brand hover:shadow-md hover:shadow-amber-brand/5 p-5 text-left transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-text-primary group-hover:text-amber-700 transition-colors">{c.name}</span>
                <span className="text-[10px] font-bold bg-cream-200 text-text-muted px-2 py-0.5 rounded-full shrink-0">+100 XP</span>
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

  /* QUIZ */
  if (screen === S.QUIZ) {
    const q = questions[step];
    const questionText = q?.question_text || q?.text || "";
    const questionId = q?.id;
    const currentAnswer = answers[questionId] || "";
    const isLast = step === questions.length - 1;
    const choices = q?.choices ?? [];

    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
          <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">Diagnostic — {concept?.name}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">Question {step + 1} of {questions.length}</p>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-0 mb-8">
          {questions.map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-emerald-400 text-white" : i === step ? "bg-amber-brand text-white shadow-md shadow-amber-brand/30 scale-110" : "bg-gray-100 text-text-muted"
              }`}>
                {i < step ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              {i < questions.length - 1 && (
                <div className={`w-10 h-0.5 ${i < step ? "bg-emerald-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-text-primary leading-snug">{questionText}</h3>
          {q?.given && (
            <div className="mt-3 rounded-xl bg-cream-100 border border-cream-300 px-4 py-2.5 text-sm text-text-secondary">{q.given}</div>
          )}
        </div>

        {choices.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6">
            {choices.map((ch) => {
              const choiceId = ch.id ?? ch.value ?? ch.text;
              const selected = currentAnswer === String(choiceId);
              return (
                <button
                  key={choiceId}
                  onClick={() => handleAnswer(questionId, String(choiceId))}
                  className={`rounded-xl border-2 px-5 py-4 text-sm text-left transition-all flex items-center gap-4 ${
                    selected ? "border-amber-brand bg-amber-brand/10" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    selected ? "border-amber-brand bg-amber-brand" : "border-gray-300 bg-white"
                  }`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={selected ? "text-text-primary font-medium" : "text-text-secondary"}>{ch.text ?? ch.label ?? choiceId}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">Your Answer</label>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => handleAnswer(questionId, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:outline-none focus:ring-2 focus:ring-amber-brand/20 transition"
            />
          </div>
        )}

        <div className="flex justify-between">
          {step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} className="rounded-xl border border-gray-200 hover:border-gray-300 px-6 py-2.5 text-sm font-semibold text-text-secondary transition-all">
              Back
            </button>
          ) : <div />}
          <button
            disabled={!currentAnswer}
            onClick={handleNext}
            className="rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 px-8 py-2.5 text-sm font-bold text-white transition-all shadow-sm shadow-amber-brand/20"
          >
            {isLast ? "Submit Answers" : "Next"}
          </button>
        </div>
      </main>
    );
  }

  /* RESULTS */
  if (screen === S.RESULTS && results) {
    const passed = results.result === "pass" || results.pass === true;
    const correctCount = results.correct_count ?? (results.feedback ?? []).filter((c) => c.is_correct || c.correct).length;
    const totalCount = results.total_count ?? (results.feedback ?? []).length;
    const score = results.score != null ? Math.round(results.score * 100) : Math.round((correctCount / (totalCount || 1)) * 100);
    const xpEarned = correctCount * 30 + (passed ? 50 : 0);
    const feedback = results.feedback ?? results.results ?? [];
    const prereqs = results.mapped_prereqs ?? [];

    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className={`rounded-2xl border-2 p-8 mb-6 text-center ${passed ? "border-emerald-300 bg-gradient-to-b from-emerald-50 to-white" : "border-amber-300 bg-gradient-to-b from-amber-50 to-white"}`}>
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>
            {passed ? (
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary mb-1">{passed ? "Assessment Passed" : "Gaps Identified"}</h2>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">
            {passed ? `Strong understanding of ${concept?.name} confirmed.` : `Areas to strengthen before fully mastering ${concept?.name}.`}
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className={`text-3xl font-extrabold ${passed ? "text-emerald-600" : "text-amber-600"}`}>{score}%</p>
              <p className="text-[11px] text-text-muted mt-0.5">Score</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-text-primary">{correctCount}/{totalCount}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Correct</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-amber-brand">+{xpEarned}</p>
              <p className="text-[11px] text-text-muted mt-0.5">XP Earned</p>
            </div>
          </div>
        </div>

        {feedback.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
            <h3 className="font-bold text-sm text-text-primary mb-4">Answer Breakdown</h3>
            <div className="flex flex-col gap-2.5">
              {feedback.map((r, i) => {
                const correct = r.is_correct ?? r.correct ?? false;
                return (
                  <div key={r.question_id ?? i} className={`flex items-start gap-3 rounded-xl p-3.5 ${correct ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${correct ? "bg-emerald-400 text-white" : "bg-red-400 text-white"}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        {correct
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        }
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary font-medium">Question {i + 1}</span>
                      {r.feedback && <p className="text-xs text-text-secondary mt-0.5">{r.feedback}</p>}
                    </div>
                    {correct && <span className="text-[11px] text-emerald-600 font-semibold shrink-0">+30 XP</span>}
                    {!correct && r.mapped_prereq && (
                      <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-semibold shrink-0">
                        Review: {PREREQ_LABELS[r.mapped_prereq] ?? r.mapped_prereq}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {prereqs.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-brand/5 p-6 mb-5">
            <h3 className="font-bold text-sm text-amber-700 mb-3">Recommended Prerequisites</h3>
            <p className="text-text-secondary text-xs mb-4">Study these topics to strengthen your foundation.</p>
            <div className="flex flex-wrap gap-2">
              {prereqs.map((p) => (
                <span key={p} className="rounded-xl border border-amber-300 bg-amber-100 text-amber-800 text-sm px-3.5 py-1.5 font-semibold">
                  {PREREQ_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          </div>
        )}

        {resources.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
            <h3 className="font-bold text-sm text-text-primary mb-4">Curated Resources</h3>
            <div className="flex flex-col gap-2.5">
              {resources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-amber-brand bg-cream-50 hover:bg-cream-100 p-4 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-brand/5 transition-colors">
                    <svg className="w-4 h-4 text-text-muted group-hover:text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{r.title}</p>
                    {r.timestamp && <p className="text-[11px] text-text-muted">Start at {r.timestamp}</p>}
                  </div>
                  <svg className="w-4 h-4 text-text-muted group-hover:text-amber-brand shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border-2 border-gray-200 hover:border-amber-brand py-3 text-sm font-bold text-text-secondary hover:text-amber-700 transition-all">
            Choose Another Topic
          </button>
          <button onClick={() => handlePickConcept(concept)} className="flex-1 rounded-xl bg-amber-brand hover:bg-amber-hover active:scale-95 py-3 text-sm font-bold text-white transition-all shadow-sm shadow-amber-brand/20">
            Retry Assessment
          </button>
        </div>
      </main>
    );
  }

  return null;
}
