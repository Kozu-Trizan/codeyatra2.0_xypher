import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CLASSES = [
  { value: "11", label: "Class 11", sub: "First year of +2" },
  { value: "12", label: "Class 12", sub: "Second year of +2" },
];

const SUBJECTS = [
  { value: "physics", label: "Physics", icon: "⚛️", available: true },
  { value: "chemistry", label: "Chemistry", icon: "🧪", available: false },
  { value: "maths", label: "Mathematics", icon: "📐", available: false },
  { value: "biology", label: "Biology", icon: "🧬", available: false },
];

export default function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = class, 2 = subject
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  function handleFinish() {
    if (!selectedClass || !selectedSubject) return;
    completeOnboarding({
      studentClass: selectedClass,
      subject: selectedSubject,
    });
    navigate("/questions", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-indigo-700/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "w-10 bg-indigo-500" : "w-4 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Class */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="text-4xl mb-4">🎓</div>
              <h1 className="text-3xl font-extrabold text-white mb-2">
                Which class are you in?
              </h1>
              <p className="text-slate-400 text-sm">
                Hi {user?.name?.split(" ")[0] ?? "there"}! We&apos;ll
                personalise your study plan based on your NEB curriculum.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {CLASSES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedClass(c.value)}
                  className={`rounded-2xl border-2 p-6 text-left transition-all ${
                    selectedClass === c.value
                      ? "border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-900/30"
                      : "border-slate-700 bg-slate-900 hover:border-slate-500"
                  }`}
                >
                  <div className="text-3xl font-extrabold text-white mb-1">
                    {c.label}
                  </div>
                  <div className="text-slate-400 text-xs">{c.sub}</div>
                  {selectedClass === c.value && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      ✓ Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              disabled={!selectedClass}
              onClick={() => setStep(2)}
              className="w-full mt-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 py-3 font-semibold text-white transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Subject */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="text-4xl mb-4">📚</div>
              <h1 className="text-3xl font-extrabold text-white mb-2">
                Choose your subject
              </h1>
              <p className="text-slate-400 text-sm">
                More subjects are coming soon. Physics is fully supported now.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  disabled={!s.available}
                  onClick={() => s.available && setSelectedSubject(s.value)}
                  className={`rounded-2xl border-2 p-5 text-left transition-all relative ${
                    !s.available
                      ? "border-slate-800 bg-slate-900/40 opacity-40 cursor-not-allowed"
                      : selectedSubject === s.value
                        ? "border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-900/30"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500"
                  }`}
                >
                  {!s.available && (
                    <span className="absolute top-2 right-2 text-[10px] text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="font-semibold text-white text-sm">
                    {s.label}
                  </div>
                  {selectedSubject === s.value && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      ✓ Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-700 hover:border-slate-500 py-3 font-semibold text-slate-300 hover:text-white transition-all"
              >
                ← Back
              </button>
              <button
                disabled={!selectedSubject}
                onClick={handleFinish}
                className="flex-[2] rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 py-3 font-semibold text-white transition-all"
              >
                Start Learning →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
