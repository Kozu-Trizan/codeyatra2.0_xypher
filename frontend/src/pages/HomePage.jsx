import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

/* ─── Subject colour helpers ─── */
const SUBJECT_COLORS = {
  physics: "border-amber-brand/30 text-amber-brand bg-amber-brand/5",
  math: "border-emerald-300 text-emerald-600 bg-emerald-50",
  chemistry: "border-blue-300 text-blue-600 bg-blue-50",
  biology: "border-green-300 text-green-600 bg-green-50",
};

const SUBJECT_LABELS = {
  physics: "Physics",
  math: "Mathematics",
  chemistry: "Chemistry",
  biology: "Biology",
};

const SUBJECT_OPTIONS = ["physics", "math", "chemistry", "biology"];

const FEATURE_ICONS = {
  diagnose: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  path: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  ),
  mission: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  progress: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
};

/* ─── Landing page for guests ─── */
const FEATURES = [
  {
    iconKey: "diagnose",
    title: "AI-Powered Diagnostics",
    desc: "Instantly identify your knowledge gaps with adaptive quizzes that learn from every answer you give.",
  },
  {
    iconKey: "path",
    title: "Personalised Learning Path",
    desc: "Get a step-by-step roadmap built around your goals — no two journeys are the same.",
  },
  {
    iconKey: "mission",
    title: "Focused Missions",
    desc: "Short, targeted challenges that fit into your schedule and build real understanding.",
  },
  {
    iconKey: "progress",
    title: "Progress You Can See",
    desc: "Track XP, streaks, and mastery levels so you always know exactly how far you've come.",
  },
];

const STATS = [
  { value: "10 000+", label: "Practice problems" },
  { value: "500+", label: "Concept breakdowns" },
  { value: "98%", label: "Students feel more confident" },
  { value: "3×", label: "Faster concept mastery" },
];

function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* ══════════ HERO ══════════ */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 pb-28 overflow-hidden">
        {/* gradient orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-amber-brand/10 blur-3xl" />

        <span className="inline-flex items-center gap-2 rounded-full border border-amber-brand/30 bg-amber-brand/5 px-4 py-1.5 text-xs font-semibold text-amber-brand mb-6 tracking-wide uppercase">
          AI-first learning platform
        </span>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-text-primary leading-tight tracking-tight max-w-3xl">
          Stop Memorising.<br />
          <span className="text-amber-brand">Start Understanding.</span>
        </h1>

        <p className="mt-6 text-lg text-text-secondary max-w-xl leading-relaxed">
          Aarvana diagnoses exactly where you're stuck, builds a custom learning path,
          and turns confusion into clarity — for every subject you study.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link
            to="/signup"
            className="rounded-xl bg-amber-brand hover:bg-amber-hover px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-brand/20 transition-all hover:shadow-amber-brand/30 hover:-translate-y-0.5"
          >
            Start learning free →
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-gray-300 hover:border-amber-brand bg-white px-8 py-3.5 text-base font-semibold text-text-primary hover:text-amber-brand transition-all"
          >
            Log in
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-xs text-text-muted">
          No credit card required · Free forever for students
        </p>
      </section>

      {/* ══════════ STATS STRIP ══════════ */}
      <section className="border-y border-gray-200 bg-white py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-text-primary">{s.value}</p>
              <p className="text-sm text-text-secondary mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-text-primary">
            Learning that actually works
          </h2>
          <p className="mt-3 text-text-secondary max-w-lg mx-auto">
            Three simple steps — from confusion to confident in record time.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: "01", iconKey: "diagnose", title: "Diagnose", desc: "Take a smart quiz. Our AI pinpoints exactly which concepts need attention — not just what you got wrong." },
            { step: "02", iconKey: "path", title: "Follow Your Path", desc: "Get a personalised roadmap with the right concepts in the right order, no guesswork needed." },
            { step: "03", iconKey: "progress", title: "Level Up", desc: "Complete missions, earn XP, and watch your mastery grow week by week." },
          ].map(({ step, iconKey, title, desc }) => (
            <div key={step} className="relative rounded-2xl border border-gray-200 bg-white p-7 hover:border-amber-brand/40 hover:shadow-sm transition-all">
              <span className="absolute top-5 right-6 text-xs font-bold text-text-muted/40 tracking-widest">{step}</span>
              <div className="w-11 h-11 rounded-xl bg-amber-brand/10 text-amber-brand flex items-center justify-center mb-4">{FEATURE_ICONS[iconKey]}</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="bg-white border-y border-gray-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-text-primary">
              Everything you need to master any subject
            </h2>
            <p className="mt-3 text-text-secondary max-w-lg mx-auto">
              Built for curious minds who want results, not just content.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-5 rounded-2xl border border-gray-200 p-6 hover:border-amber-brand/40 hover:shadow-sm transition-all">
                <div className="w-11 h-11 rounded-xl bg-amber-brand/10 text-amber-brand flex items-center justify-center flex-shrink-0">{FEATURE_ICONS[f.iconKey]}</div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SUBJECTS ══════════ */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-extrabold text-text-primary mb-3">
          One platform. Every subject.
        </h2>
        <p className="text-text-secondary mb-10 max-w-md mx-auto">
          From equations to essays — Aarvana meets you wherever you study.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Computer Science", "History", "Literature"].map((s) => (
            <span key={s} className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-text-secondary hover:border-amber-brand hover:text-amber-brand transition-colors cursor-default">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════ CTA BANNER ══════════ */}
      <section className="mx-6 mb-20 rounded-3xl bg-gradient-to-br from-amber-brand to-amber-hover p-12 text-center text-white max-w-4xl xl:mx-auto">
        <h2 className="text-3xl font-extrabold mb-3">
          Your next breakthrough is one session away.
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          Join thousands of students who stopped struggling and started mastering.
        </p>
        <Link
          to="/signup"
          className="inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-amber-brand hover:bg-cream-50 transition-all shadow-lg"
        >
          Get started — it's free
        </Link>
      </section>
    </div>
  );
}

export default function HomePage() {
  const { user, authFetch } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem("aarvana_subjects");
    return saved ? JSON.parse(saved) : ["physics"];
  });

  /* Show landing page for guests */
  if (!user) return <LandingPage />;

  /* Fetch concepts from the API */
  useEffect(() => {
    authFetch("/api/concepts")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const list = json?.data?.concepts ?? json ?? [];
        setConcepts(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Persist subjects */
  useEffect(() => {
    localStorage.setItem("aarvana_subjects", JSON.stringify(subjects));
  }, [subjects]);

  /* Recently viewed (stored in localStorage) */
  const recentIds = JSON.parse(localStorage.getItem("aarvana_recent") || "[]");
  const recentConcepts = recentIds
    .map((id) => concepts.find((c) => c.id === id))
    .filter(Boolean)
    .slice(0, 3);

  function markViewed(id) {
    const prev = JSON.parse(localStorage.getItem("aarvana_recent") || "[]");
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    localStorage.setItem("aarvana_recent", JSON.stringify(next));
  }

  /* Group concepts by topic, filtered to selected subjects */
  const filtered = concepts.filter((c) => subjects.includes(c.subject));
  const grouped = {};
  filtered.forEach((c) => {
    if (!grouped[c.topic]) grouped[c.topic] = [];
    grouped[c.topic].push(c);
  });

  function toggleSubject(s) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function addSubject() {
    const available = SUBJECT_OPTIONS.filter((s) => !subjects.includes(s));
    if (available.length > 0) setSubjects((prev) => [...prev, available[0]]);
  }

  const xp = 0; // TODO: compute from progress

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm animate-pulse">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* ═══ Welcome Header ═══ */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-brand to-amber-hover flex items-center justify-center shadow-md shadow-amber-brand/20">
            <span className="text-white font-extrabold text-lg">{(user?.name || "E")[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Welcome back, {user?.name || "Explorer"}!
            </h1>
            <p className="text-text-secondary text-sm">
              {user?.class ? `Grade ${user.class}` : "Student"} · Keep the momentum going!
            </p>
            {/* Subject badges */}
            <div className="flex gap-2 mt-1.5">
              {subjects.map((s) => (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${SUBJECT_COLORS[s] || "border-gray-200 text-text-secondary bg-gray-50"}`}
                >
                  {SUBJECT_LABELS[s] || s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-1.5 text-amber-brand font-bold text-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {xp}
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { to: "/diagnose", iconKey: "diagnose", label: "Run Diagnosis", desc: "Find your gaps" },
          { to: "/pathfinder", iconKey: "path", label: "Learning Path", desc: "Follow your roadmap" },
          { to: "/questions", iconKey: "mission", label: "Missions", desc: "Practice & earn XP" },
          { to: "/progress", iconKey: "progress", label: "Progress", desc: "Track your growth" },
        ].map(({ to, iconKey, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center text-center rounded-2xl border border-gray-200 bg-white hover:border-amber-brand/50 hover:shadow-sm p-4 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-amber-brand/10 text-text-muted group-hover:text-amber-brand flex items-center justify-center mb-2 transition-all">{FEATURE_ICONS[iconKey]}</div>
            <span className="text-xs font-bold text-text-primary group-hover:text-amber-brand transition-colors">{label}</span>
            <span className="text-xs text-text-muted mt-0.5">{desc}</span>
          </Link>
        ))}
      </div>

      {/* ═══ Your Subjects ═══ */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-sm font-semibold text-text-secondary">Your Subjects:</span>
        {subjects.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-text-primary"
          >
            {SUBJECT_LABELS[s] || s}
            <button
              onClick={() => toggleSubject(s)}
              className="text-text-muted hover:text-red-400 transition-colors ml-0.5"
              title="Remove"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        {subjects.length < SUBJECT_OPTIONS.length && (
          <button
            onClick={addSubject}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 hover:border-amber-brand px-3.5 py-1.5 text-sm font-medium text-text-secondary hover:text-amber-brand transition-colors"
          >
            + Add Subject
          </button>
        )}
      </div>

      {/* ═══ Recently Viewed ═══ */}
      {recentConcepts.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentConcepts.map((c) => (
              <Link
                key={c.id}
                to={`/pathfinder`}
                onClick={() => markViewed(c.id)}
                className="rounded-2xl border border-gray-200 bg-white hover:border-amber-brand/40 hover:shadow-sm p-5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-text-primary group-hover:text-amber-brand transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-text-secondary text-sm">{c.topic}</p>
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${SUBJECT_COLORS[c.subject] || ""}`}>
                      {SUBJECT_LABELS[c.subject] || c.subject}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-text-muted group-hover:text-amber-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Explore More Topics ═══ */}
      <section>
        <h2 className="text-xl font-extrabold text-text-primary mb-6">
          Explore More Topics
        </h2>

        {Object.keys(grouped).length === 0 && (
          <p className="text-text-secondary text-sm">No topics found. Try adding a subject above.</p>
        )}

        {Object.entries(grouped).map(([topic, items]) => (
          <div key={topic} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-brand" />
              <h3 className="font-bold text-text-primary">{topic}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to={`/pathfinder`}
                  onClick={() => markViewed(c.id)}
                  className="rounded-2xl border border-gray-200 bg-white hover:border-amber-brand/40 hover:shadow-sm p-4 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-text-primary group-hover:text-amber-brand transition-colors text-sm">
                        {c.name}
                      </h4>
                      <p className="text-text-muted text-xs mt-0.5">{c.topic}</p>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:text-amber-brand transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
