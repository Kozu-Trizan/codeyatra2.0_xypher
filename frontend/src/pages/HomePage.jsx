import { Link } from "react-router-dom";

/* ───── Feature cards data ───── */
const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8 text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: "Blocker Detection",
    body: "Diagnose exactly which math or physics prerequisite is blocking your understanding through step-by-step guided analysis.",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M13 17V7m-6 5 6-5 6 5M5 21h14" />
      </svg>
    ),
    title: "Learning Roadmap",
    body: "See a clear visual path from where you are stuck to where you need to be. Every concept dependency made visible.",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "Curated Resources",
    body: "Get routed to exact timestamps of trusted Nepali educators on YouTube to bridge your specific knowledge gaps.",
  },
];

/* ───── How-it-works steps ───── */
const STEPS = [
  {
    n: "01",
    title: "Pick a Concept",
    desc: "Choose any NEB +2 Physics concept you want to master.",
  },
  {
    n: "02",
    title: "Take the Diagnostic",
    desc: "Answer checkpoint MCQs that probe your prerequisite understanding.",
  },
  {
    n: "03",
    title: "Get Your Path",
    desc: "Receive a visual roadmap and curated resources to fill every gap.",
  },
];

/* ───── Stats ───── */
const STATS = [
  { value: "20+", label: "Physics Concepts" },
  { value: "60s", label: "Diagnosis Time" },
  { value: "100%", label: "Free & Open" },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Decorative floating dots ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-amber-brand/30"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + (i % 3) * 35}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════ */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left — copy */}
        <div className="flex-1 max-w-xl">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-text-primary">
            Find where
            <br />
            you are stuck.
            <br />
            <span className="text-amber-brand">
              Start from the
              <br />
              right concept.
            </span>
          </h1>

          <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-md">
            Aarvana is your personal learning detective for NEB Physics. We
            diagnose exactly which prerequisite gaps are blocking you and guide
            you step by step to mastery.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/diagnose"
              className="group rounded-full bg-amber-brand hover:bg-amber-hover active:scale-[0.97] px-8 py-3.5 font-semibold text-white transition-all shadow-lg shadow-amber-brand/25 flex items-center gap-2"
            >
              Start Detective Mission
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/pathfinder"
              className="rounded-full border-2 border-gray-300 hover:border-amber-brand px-8 py-3.5 font-semibold text-text-primary hover:text-amber-brand transition-all"
            >
              View Learning Path
            </Link>
          </div>
        </div>

        {/* Right — mascot/illustration area */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Soft warm blob behind */}
          <div className="absolute w-80 h-80 rounded-full bg-amber-brand/10 blur-3xl" />

          {/* Mascot placeholder */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-52 h-52 rounded-full bg-gradient-to-br from-amber-brand/20 to-cream-200 flex items-center justify-center text-8xl shadow-inner">
              🐥
            </div>

            {/* Floating badges */}
            <div className="absolute -top-2 right-0 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-1.5 flex items-center gap-2 text-sm font-medium text-text-primary animate-bounce" style={{ animationDuration: '3s' }}>
              <svg className="w-4 h-4 text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              Gap Detected
            </div>
            <div className="absolute -bottom-2 -left-4 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-1.5 flex items-center gap-2 text-sm font-medium text-text-primary animate-bounce" style={{ animationDuration: '3.5s' }}>
              <svg className="w-4 h-4 text-amber-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M13 17V7m-6 5 6-5 6 5M5 21h14" />
              </svg>
              Path Found
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative bg-cream-100/60 py-24 px-6"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-text-primary mb-3">
            How Aarvana Works
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto mb-16">
            A diagnostic-driven approach to learning that finds your gaps before
            they find you in the exam.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-left hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-brand/10 flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {f.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          THREE STEPS
      ══════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-text-primary mb-3">
            Three Steps. Under a Minute.
          </h2>
          <p className="text-text-secondary max-w-md mx-auto mb-16">
            No sign-up wall. No credit card. Jump straight in.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+2rem)] right-[-50%] h-px bg-gray-200" />
                )}
                <div className="w-12 h-12 rounded-full bg-amber-brand text-white flex items-center justify-center font-mono font-bold text-sm mb-5 z-10 shadow-md shadow-amber-brand/20">
                  {step.n}
                </div>
                <h3 className="font-bold text-text-primary mb-1">
                  {step.title}
                </h3>
                <p className="text-text-secondary text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════ */}
      <section className="bg-cream-100/60 py-14 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-px rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center flex-1 min-w-[140px] px-8 py-6"
            >
              <span className="text-3xl font-extrabold text-amber-brand">
                {s.value}
              </span>
              <span className="text-xs text-text-muted mt-1 uppercase tracking-wide font-medium">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-br from-amber-brand/10 to-cream-200 border border-amber-brand/20 p-12 text-center">
          <h2 className="text-3xl font-extrabold text-text-primary mb-3">
            Ready to find your learning gaps?
          </h2>
          <p className="text-text-secondary mb-8">
            Pick a concept, take the diagnostic, get your personalised path — all in under 60 seconds.
          </p>
          <Link
            to="/diagnose"
            className="inline-flex items-center gap-2 rounded-full bg-amber-brand hover:bg-amber-hover px-10 py-3.5 font-semibold text-white transition-all shadow-lg shadow-amber-brand/25"
          >
            Start Your Diagnosis
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center text-xs text-text-muted">
        Aarvana · Built for CodeYatra 2.0 · NEB +2 Physics Diagnostic Engine
      </footer>
    </div>
  );
}
