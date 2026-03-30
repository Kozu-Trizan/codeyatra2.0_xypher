/**

 * LearnPage - Mission-based learning with end-of-mission diagnosis.

 *

 * Route: /learn/:conceptId

 *

 * Flow:

 *   1. Browse available problems for this concept

 *   2. Start a mission - see the problem statement + simulation

 *   3. Tap through each step, selecting ONE option per step (no immediate feedback)

 *   4. Complete all steps -> "Submit Mission" button activates

 *   5. See full end-of-mission diagnostic report:

 *      -> Score, step-by-step review, misconceptions, resources

 */



import { useEffect, useState, useCallback } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";



// Simulation components

import VectorDecomposition from "../components/simulations/physics/VectorDecomposition";

import FunctionGraphing from "../components/simulations/mathematics/FunctionGraphing";

import AreaUnderCurves from "../components/simulations/mathematics/AreaUnderCurves";

import ProjectileMotion from "../components/simulations/physics/ProjectileMotion";

import PendulumSim from "../components/simulations/physics/PendulumSim";

import WaveSim from "../components/simulations/physics/WaveSim";

import CircuitBuilder from "../components/simulations/physics/CircuitBuilder";

import MolecularStructure from "../components/simulations/chemistry/MolecularStructure";



const SIM_COMPONENT = {

  vector_decomposition: VectorDecomposition,

  function_graphing: FunctionGraphing,

  area_under_curve: AreaUnderCurves,

  projectile_motion: ProjectileMotion,

  pendulum_sim: PendulumSim,

  wave_sim: WaveSim,

  circuit_builder: CircuitBuilder,

  molecular_structure: MolecularStructure,

};



const DIFFICULTY_LABEL = { 1: "Beginner", 2: "Explorer", 3: "Master" };

const DIFFICULTY_COLOR = {

  1: "bg-emerald-100 text-emerald-700 border-emerald-200",

  2: "bg-amber-100 text-amber-700 border-amber-200",

  3: "bg-rose-100 text-rose-700 border-rose-200",

};



function Badge({ label, colorClass }) {

  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>{label}</span>;

}



function StepDot({ index, status }) {

  const base = "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border-2 transition-all";

  const look = {

    done:       "bg-amber-brand border-amber-brand text-white",

    active:     "bg-white border-amber-brand text-amber-700 ring-2 ring-amber-brand/20",

    unanswered: "bg-gray-100 border-gray-300 text-text-muted",

  }[status] ?? "bg-gray-100 border-gray-300 text-text-muted";

  return <div className={`${base} ${look}`}>{index + 1}</div>;

}



export default function LearnPage() {

  const { conceptId } = useParams();

  const { authFetch, user } = useAuth();

  const navigate = useNavigate();



  const [concept, setConcept] = useState(null);

  const [problems, setProblems] = useState([]);

  const [simulation, setSimulation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);



  const [session, setSession] = useState(null);

  const [stepIndex, setStepIndex] = useState(0);

  const [answers, setAnswers] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const [missionResult, setMissionResult] = useState(null);



  useEffect(() => {

    if (!conceptId) return;

    (async () => {

      try {

        const [conR, probR, simR] = await Promise.all([

          authFetch(`/api/concepts/${conceptId}`),

          authFetch(`/api/problems?concept_id=${conceptId}`),

          authFetch(`/api/simulations/${conceptId}`),

        ]);

        const [conD, probD] = await Promise.all([conR.json(), probR.json()]);

        setConcept(conD?.data ?? conD);

        setProblems(probD?.data?.problems ?? []);

        if (simR.ok) {

          const simD = await simR.json();

          setSimulation(simD?.data?.simulation ?? null);

        }

      } catch (e) { setError(e.message); }

      finally { setLoading(false); }

    })();

  }, [conceptId, authFetch]);



  const startMission = useCallback(async (problem) => {

    if (!user?.id) return;

    try {

      const [probRes, sessRes] = await Promise.all([

        authFetch(`/api/problems/${problem.id}`),

        authFetch("/api/sessions/start", {

          method: "POST",

          body: JSON.stringify({ problem_id: problem.id, student_id: user.id }),

        }),

      ]);

      const [probData, sessData] = await Promise.all([probRes.json(), sessRes.json()]);

      if (!sessRes.ok) throw new Error(sessData.error?.message ?? "Could not start session.");

      const fullProblem = probData?.data ?? probData;

      const sessionData = sessData?.data ?? sessData;

      setSession({ session_id: sessionData.session_id, steps: fullProblem.steps ?? [], problem: fullProblem });

      setStepIndex(0);

      setAnswers({});

      setMissionResult(null);

    } catch (e) { alert(e.message); }

  }, [authFetch, user?.id]);



  const selectOption = (stepId, optionId) => setAnswers((prev) => ({ ...prev, [stepId]: optionId }));



  const submitMission = async () => {

    if (!session) return;

    setSubmitting(true);

    try {

      const payload = session.steps.map((s) => ({ step_id: s.id, selected_option_id: answers[s.id] }));

      const res = await authFetch(`/api/sessions/${session.session_id}/complete-mission`, {

        method: "POST",

        body: JSON.stringify({ answers: payload }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message ?? "Could not submit mission.");

      setMissionResult(data?.data ?? data);

    } catch (e) { alert(e.message); }

    finally { setSubmitting(false); }

  };



  const closeMission = () => { setSession(null); setAnswers({}); setMissionResult(null); setStepIndex(0); };



  if (loading) return (

    <div className="flex items-center justify-center min-h-[60vh]">

      <div className="flex flex-col items-center gap-3">

        <div className="w-10 h-10 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />

        <p className="text-text-secondary text-sm">Loading mission...</p>

      </div>

    </div>

  );



  if (error || !concept) return (

    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">

      <p className="text-red-600 font-semibold">{error || "Concept not found."}</p>

      <button onClick={() => navigate("/questions")} className="px-5 py-2.5 rounded-xl bg-amber-brand text-white font-bold text-sm">Back to Missions</button>

    </div>

  );



  const SimComp = simulation ? SIM_COMPONENT[simulation.simulation_type] : null;

  const allAnswered = session ? session.steps.every((s) => answers[s.id] !== undefined) : false;



  return (

    <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">

      <div className="flex items-center gap-4">

        <button onClick={() => navigate("/questions")} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">

          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>

          Missions

        </button>

        <span className="text-text-muted">/</span>

        <h1 className="text-xl font-extrabold text-text-primary truncate">{concept.name}</h1>

        {concept.neb_class && (

          <span className="text-xs font-semibold bg-amber-brand/10 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full">Class {concept.neb_class}</span>

        )}

      </div>



      <div className={`flex flex-col ${SimComp ? "lg:flex-row" : ""} gap-6`}>

        {SimComp && (

          <div className="lg:w-[45%] flex-shrink-0">

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">

                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">

                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" /></svg>

                </div>

                <div>

                  <p className="text-sm font-bold text-text-primary">{simulation.title}</p>

                  <p className="text-xs text-text-muted">Interactive simulation -- explore before solving</p>

                </div>

              </div>

              <div className="p-3"><SimComp conceptId={Number(conceptId)} /></div>

            </div>

          </div>

        )}



        <div className="flex-1 min-w-0">

          {missionResult && (

            <MissionReport result={missionResult} problem={session.problem} onClose={closeMission}

              onRetry={() => { setMissionResult(null); setAnswers({}); setStepIndex(0); }} />

          )}

          {!missionResult && session && (

            <ActiveMission session={session} stepIndex={stepIndex} setStepIndex={setStepIndex}

              answers={answers} selectOption={selectOption} onSubmit={submitMission}

              onClose={closeMission} allAnswered={allAnswered} submitting={submitting} />

          )}

          {!missionResult && !session && (

            <ProblemList problems={problems} SimComp={SimComp} onStart={startMission} />

          )}

        </div>

      </div>

      

      {/* AI Tutor ChatBot Overlay */}

      <ChatBot />

    </main>

  );

}



/* --- ActiveMission ----------------------------------------------- */

function ActiveMission({ session, stepIndex, setStepIndex, answers, selectOption, onSubmit, onClose, allAnswered, submitting }) {

  const steps = session.steps;

  const activeStep = steps[stepIndex];

  const letters = ["A", "B", "C", "D"];



  return (

    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">

        <div className="flex-1 min-w-0">

          <p className="font-extrabold text-text-primary text-base leading-snug">{session.problem.title}</p>

          <p className="text-xs text-text-muted mt-0.5">

            {session.problem.subject && <span className="text-indigo-500 font-medium">{session.problem.subject}</span>}

            {session.problem.subtopic && <span> {String.fromCharCode(183)} {session.problem.subtopic}</span>}

          </p>

        </div>

        <button onClick={onClose} className="flex-shrink-0 text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">Exit</button>

      </div>



      {session.problem.problem_statement && (

        <div className="mx-5 mt-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">

          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Problem</p>

          <p className="text-sm text-text-primary leading-relaxed">{session.problem.problem_statement}</p>

        </div>

      )}



      <div className="flex items-center gap-2 px-5 py-4">

        {steps.map((s, i) => (

          <button key={s.id} onClick={() => setStepIndex(i)}>

            <StepDot index={i} status={i === stepIndex ? "active" : answers[s.id] !== undefined ? "done" : "unanswered"} />

          </button>

        ))}

        <div className="ml-auto text-xs text-text-muted font-medium">

          {Object.keys(answers).length} / {steps.length} answered

        </div>

      </div>



      {activeStep && (

        <div className="px-5 pb-5">

          <div className="rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 mb-4">

            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Step {activeStep.step_number} of {steps.length}</p>

            <p className="text-sm font-semibold text-text-primary">{activeStep.step_title}</p>

            {activeStep.step_description && <p className="text-xs text-text-secondary mt-1 leading-relaxed">{activeStep.step_description}</p>}

          </div>



          <div className="flex flex-col gap-2.5 mb-5">

            {(activeStep.options ?? []).map((opt, idx) => {

              const isSelected = answers[activeStep.id] === opt.id;

              return (

                <button key={opt.id} onClick={() => selectOption(activeStep.id, opt.id)}

                  className={`rounded-xl border-2 px-4 py-3.5 text-sm text-left transition-all flex items-start gap-3 active:scale-[0.99] ${

                    isSelected ? "border-amber-brand bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"

                  }`}>

                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${

                    isSelected ? "bg-amber-brand text-white" : "bg-gray-100 text-text-muted"

                  }`}>{letters[idx] ?? idx + 1}</span>

                  <span className={`leading-snug ${isSelected ? "text-text-primary font-medium" : "text-text-secondary"}`}>{opt.option_text}</span>

                </button>

              );

            })}

          </div>



          <div className="flex items-center justify-between gap-3">

            <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}

              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-text-secondary disabled:opacity-30 hover:border-gray-300 transition-all">{"\u2190"} Prev</button>

            {stepIndex < steps.length - 1 ? (

              <button onClick={() => setStepIndex((i) => i + 1)}

                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-text-primary transition-all">Next {"\u2192"}</button>

            ) : (

              <button onClick={onSubmit} disabled={!allAnswered || submitting}

                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${allAnswered ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-gray-300 cursor-not-allowed"}`}>

                {submitting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />Submitting...</span>

                  : allAnswered ? "{\"\u2713\"} Submit Mission" : `${steps.length - Object.keys(answers).length} unanswered`}

              </button>

            )}

          </div>



          {allAnswered && stepIndex < steps.length - 1 && (

            <button onClick={onSubmit} disabled={submitting}

              className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/20">

              {submitting ? "Submitting..." : "{\"\u2713\"} All Answered - Submit Mission"}

            </button>

          )}

        </div>

      )}

    </div>

  );

}



/* --- MissionReport ----------------------------------------------- */

function MissionReport({ result, problem, onClose, onRetry }) {

  const { score, total_steps, passed, percentage, step_results = [], resources = [], misconceptions = [], key_objectives = [] } = result;

  const [expandedStep, setExpandedStep] = useState(null);



  return (

    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      <div className={`px-6 py-5 ${passed ? "bg-emerald-50 border-b border-emerald-200" : "bg-amber-50 border-b border-amber-200"}`}>

        <div className="flex items-center gap-4">

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>

            {passed ? (

              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>

            ) : (

              <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>

            )}

          </div>

          <div className="flex-1">

            <h2 className="text-xl font-extrabold text-text-primary">{passed ? "Mission Complete!" : "Mission Reviewed"}</h2>

            <p className={`text-sm font-medium mt-0.5 ${passed ? "text-emerald-700" : "text-amber-700"}`}>{score} of {total_steps} steps correct {String.fromCharCode(183)} {percentage}%</p>

          </div>

          <div className={`rounded-xl px-4 py-2 text-center ${passed ? "bg-emerald-100" : "bg-amber-100"}`}>

            <p className={`text-2xl font-black ${passed ? "text-emerald-700" : "text-amber-700"}`}>{score}/{total_steps}</p>

            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Score</p>

          </div>

        </div>

      </div>



      <div className="px-6 py-5 flex flex-col gap-5">

        <div>

          <h3 className="text-sm font-bold text-text-primary mb-3">Step Review</h3>

          <div className="flex flex-col gap-2">

            {step_results.map((sr, idx) => (

              <div key={sr.step_id} className={`rounded-xl border overflow-hidden transition-all ${sr.was_correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>

                <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${sr.was_correct ? "bg-emerald-400" : "bg-red-400"}`}>

                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>

                      {sr.was_correct ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}

                    </svg>

                  </div>

                  <span className={`text-sm font-semibold flex-1 text-left ${sr.was_correct ? "text-emerald-800" : "text-red-800"}`}>Step {sr.step_number}: {sr.step_title}</span>

                  <svg className={`w-4 h-4 text-text-muted transition-transform ${expandedStep === idx ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>

                </button>

                {expandedStep === idx && (

                  <div className={`px-4 pb-4 border-t ${sr.was_correct ? "border-emerald-200" : "border-red-200"}`}>

                    {!sr.was_correct && (

                      <div className="mt-3 flex flex-col gap-1.5">

                        <div className="rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-xs"><span className="font-bold text-red-700">Your answer: </span><span className="text-red-800">{sr.selected_option_text}</span></div>

                        <div className="rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-2 text-xs"><span className="font-bold text-emerald-700">Correct answer: </span><span className="text-emerald-800">{sr.correct_option_text}</span></div>

                      </div>

                    )}

                    {sr.explanation && (

                      <div className={`mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${sr.was_correct ? "bg-emerald-100 border border-emerald-200 text-emerald-800" : "bg-white border border-red-200 text-text-secondary"}`}>

                        <p className="font-bold mb-1">{sr.was_correct ? "Why this is correct:" : "Explanation:"}</p>

                        <p>{sr.explanation}</p>

                      </div>

                    )}

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>



        {misconceptions.length > 0 && (

          <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-4">

            <h3 className="text-sm font-bold text-orange-800 mb-2">{"\u26A0"} Common Misconceptions to Watch For</h3>

            <ul className="flex flex-col gap-1.5">{misconceptions.map((m, i) => (

              <li key={i} className="flex items-start gap-2 text-xs text-orange-800">

                <span className="mt-0.5 w-4 h-4 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i + 1}</span>{m}

              </li>

            ))}</ul>

          </div>

        )}



        {key_objectives.length > 0 && (

          <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-4">

            <h3 className="text-sm font-bold text-indigo-800 mb-2">{"\u2726"} Learning Objectives</h3>

            <ul className="flex flex-col gap-1.5">{key_objectives.map((obj, i) => (

              <li key={i} className="flex items-start gap-2 text-xs text-indigo-800">

                <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{obj}

              </li>

            ))}</ul>

          </div>

        )}



        {resources.length > 0 && (

          <div>

            <h3 className="text-sm font-bold text-text-primary mb-3">Resources to Review</h3>

            <div className="flex flex-col gap-2">

              {resources.map((r) => (

                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"

                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-amber-brand/40 hover:shadow-sm transition-all">

                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">

                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-semibold text-text-primary truncate">{r.title}</p>

                    {r.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{r.description}</p>}

                  </div>

                  <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>

                </a>

              ))}

            </div>

          </div>

        )}



        <div className="flex gap-3 pt-2">

          <button onClick={onRetry} className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm font-semibold text-text-secondary transition-all">Try Again</button>

          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover text-sm font-bold text-white transition-all active:scale-95">Back to Problems</button>

        </div>

      </div>

    </div>

  );

}



/* --- ProblemList -------------------------------------------------- */

function ProblemList({ problems, SimComp, onStart }) {

  return (

    <div>

      <h2 className="text-base font-bold text-text-primary mb-3">

        Practice Problems <span className="text-xs font-normal text-text-muted">({problems.length} available)</span>

      </h2>

      {problems.length === 0 ? (

        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 bg-cream-50">

          <p className="text-text-muted text-sm">No problems available for this concept yet.</p>

        </div>

      ) : (

        <div className="flex flex-col gap-3">

          {problems.map((prob) => (

            <div key={prob.id} className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4 hover:border-amber-brand/40 hover:shadow-md hover:shadow-amber-brand/5 transition-all">

              <div className="w-10 h-10 rounded-xl bg-amber-brand/10 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold text-xs">

                {prob.ext_id ? prob.ext_id.slice(0, 4) : `P${prob.id}`}

              </div>

              <div className="flex-1 min-w-0">

                <p className="font-bold text-text-primary text-sm">{prob.title}</p>

                {prob.problem_statement && <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">{prob.problem_statement}</p>}

                <div className="flex items-center gap-2 mt-2 flex-wrap">

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${({1:"bg-emerald-100 text-emerald-700 border-emerald-200",2:"bg-amber-100 text-amber-700 border-amber-200",3:"bg-rose-100 text-rose-700 border-rose-200"})[prob.difficulty] ?? "bg-amber-100 text-amber-700 border-amber-200"}`}>

                    {({1:"Beginner",2:"Explorer",3:"Master"})[prob.difficulty] ?? "Explorer"}

                  </span>

                  {prob.step_count > 0 && <span className="text-[11px] text-text-muted">{prob.step_count} step{prob.step_count !== 1 ? "s" : ""}</span>}

                  {prob.subject && <span className="text-[11px] text-indigo-500 font-medium">{prob.subject}</span>}

                </div>

              </div>

              <button onClick={() => onStart(prob)} className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover text-white font-bold text-sm transition-all active:scale-95 shadow-sm shadow-amber-brand/20">Start {"\u2192"}</button>

            </div>

          ))}

        </div>

      )}

      {SimComp && (

        <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">

          <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>

          <p className="text-xs text-indigo-700 font-medium">Use the simulation on the left to explore the concept before starting a problem.</p>

        </div>

      )}

    </div>

  );

}



function ChatBot() {

  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([

    { id: 1, text: "Hi! I'm your tutor. Stuck on a problem? Ask me anything!", sender: "ai" }

  ]);

  const [input, setInput] = useState("");



  const handleSend = (e) => {

    e.preventDefault();

    if (!input.trim()) return;

    

    const userMsg = { id: Date.now(), text: input, sender: "user" };

    setMessages(prev => [...prev, userMsg]);

    setInput("");



    // Mock response

    setTimeout(() => {

      setMessages(prev => [...prev, { 

        id: Date.now() + 1, 

        text: "That's a great question! I'm currently running in template mode, but soon I'll be connected to a powerful LLM to help you solve this step-by-step.", 

        sender: "ai" 

      }]);

    }, 1000);

  };



  return (

    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">

      {isOpen && (

        <div className="w-80 h-96 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">

          {/* Header */}

          <div className="bg-amber-500 px-4 py-3 flex justify-between items-center text-white shadow-sm">

            <div className="flex items-center gap-2">

                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse box-shadow-green"/>

                <span className="font-bold text-sm tracking-wide">Tutor</span>

            </div>

            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">

              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>

            </button>

          </div>

          

          {/* Messages */}

          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto flex flex-col gap-3">

            {messages.map(m => (

              <div key={m.id} className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm shadow-sm ${

                m.sender === "user" 

                  ? "bg-amber-500 text-white self-end rounded-br-sm" 

                  : "bg-white border border-gray-100 text-gray-700 self-start rounded-bl-sm"

              }`}>

                {m.text}

              </div>

            ))}

          </div>



          {/* Input */}

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">

            <input 

              type="text" 

              value={input}

              onChange={e => setInput(e.target.value)}

              placeholder="Ask a question..."

              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-gray-400"

            />

            <button type="submit" disabled={!input.trim()} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-all shadow-sm active:scale-95">

              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>

            </button>

          </form>

        </div>

      )}



      <button 

        onClick={() => setIsOpen(!isOpen)}

        className="group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-1 transition-all duration-300 active:scale-95"

      >

        {isOpen ? (

            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>

        ) : (

            <svg className="w-7 h-7 transform group-hover:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>

        )}

      </button>

    </div>

  );

}

