import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CLASSES = [
  { value: "11", label: "Class 11", sub: "First year of +2" },
  { value: "12", label: "Class 12", sub: "Second year of +2" },
];

const SUBJECTS = [
  { value: "physics", label: "Physics", abbr: "Ph", available: true },
  { value: "chemistry", label: "Chemistry", abbr: "Ch", available: false },
  { value: "maths", label: "Mathematics", abbr: "Mx", available: false },
  { value: "biology", label: "Biology", abbr: "Bi", available: false },
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
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "w-10 bg-amber-brand" : "w-4 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Class */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-brand/15 text-amber-brand flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h1 className="text-3xl font-extrabold text-text-primary mb-2">
                Which class are you in?
              </h1>
              <p className="text-text-secondary text-sm">
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
                      ? "border-amber-brand bg-amber-brand/10 shadow-lg shadow-amber-brand/10"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-3xl font-extrabold text-text-primary mb-1">
                    {c.label}
                  </div>
                  <div className="text-text-secondary text-xs">{c.sub}</div>
                  {selectedClass === c.value && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-brand px-2 py-0.5 text-xs font-semibold text-white">
                      ✓ Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              disabled={!selectedClass}
              onClick={() => setStep(2)}
              className="w-full mt-8 rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 py-3 font-semibold text-white transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Subject */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-brand/15 text-amber-brand flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              </div>
              <h1 className="text-3xl font-extrabold text-text-primary mb-2">
                Choose your subject
              </h1>
              <p className="text-text-secondary text-sm">
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
                      ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                      : selectedSubject === s.value
                        ? "border-amber-brand bg-amber-brand/10 shadow-lg shadow-amber-brand/10"
                        : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {!s.available && (
                    <span className="absolute top-2 right-2 text-[10px] text-text-muted bg-gray-100 rounded px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-lg bg-amber-brand/10 text-amber-700 flex items-center justify-center text-sm font-bold mb-2">{s.abbr}</div>
                  <div className="font-semibold text-text-primary text-sm">
                    {s.label}
                  </div>
                  {selectedSubject === s.value && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-brand px-2 py-0.5 text-xs font-semibold text-white">
                      ✓ Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border-2 border-gray-300 hover:border-gray-400 py-3 font-semibold text-text-secondary hover:text-text-primary transition-all"
              >
                ← Back
              </button>
              <button
                disabled={!selectedSubject}
                onClick={handleFinish}
                className="flex-[2] rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 py-3 font-semibold text-white transition-all"
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
