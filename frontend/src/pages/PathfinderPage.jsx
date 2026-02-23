import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PREREQ_LABELS = {
  vectors_components: "Vectors & Components",
  trigonometry: "Trigonometry",
  angular_kinematics: "Angular Kinematics",
  newtons_laws: "Newton's Laws",
  energy_work: "Energy & Work",
  calculus_basics: "Calculus Basics",
};

/* tier colours in bottom-up order */
const TIER_COLORS = [
  { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-400", badge: "Ready", badgeBg: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-400",   badge: "Locked", badgeBg: "bg-amber-100/70 text-amber-700" },
  { bg: "bg-orange-50",  border: "border-orange-200",  dot: "bg-orange-400",  badge: "Locked", badgeBg: "bg-orange-100/70 text-orange-700" },
  { bg: "bg-rose-50",    border: "border-rose-200",    dot: "bg-rose-400",    badge: "Locked", badgeBg: "bg-rose-100/70 text-rose-700" },
  { bg: "bg-purple-50",  border: "border-purple-200",  dot: "bg-purple-400",  badge: "Locked", badgeBg: "bg-purple-100/70 text-purple-700" },
];

const TIER_NAMES = ["Foundation", "Core Prerequisites", "Intermediate", "Advanced", "Target Concept"];

export default function PathfinderPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [concepts, setConcepts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [path, setPath] = useState(null);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/api/concepts")
      .then((r) => r.json())
      .then((d) => { const list = d?.data?.concepts ?? d ?? []; setConcepts(Array.isArray(list) ? list : []); setLoadingConcepts(false); })
      .catch(() => setLoadingConcepts(false));
  }, []);

  const handleFind = async () => {
    if (!selectedId) return;
    setLoadingPath(true);
    setPath(null);
    setError(null);
    try {
      const res = await authFetch(`/api/concepts/${selectedId}/path`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPath(data?.data ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPath(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-xl bg-amber-brand/10 text-amber-brand flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Learning Roadmap
          </h2>
          <p className="text-text-secondary text-sm mt-0.5">
            Your prerequisite dependency path — bottom up
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-text-secondary">
        {[
          { color: "bg-emerald-400", label: "Mastered" },
          { color: "bg-amber-brand", label: "Ready" },
          { color: "bg-amber-300", label: "Current" },
          { color: "bg-rose-400", label: "Blocker" },
          { color: "bg-gray-300", label: "Locked" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Concept picker card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-8 shadow-sm">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
          Choose your target concept
        </label>
        {loadingConcepts ? (
          <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setPath(null); setError(null); }}
              className="flex-1 bg-cream-100 border border-gray-300 rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/40 focus:border-amber-brand transition-all appearance-none"
            >
              <option value="">— Select a concept —</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.class ? ` (Class ${c.class})` : ""}</option>
              ))}
            </select>
            <button
              onClick={handleFind}
              disabled={!selectedId || loadingPath}
              className="px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-all active:scale-95 shadow-sm shadow-amber-brand/20"
            >
              {loadingPath ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  Finding...
                </span>
              ) : "Explore Path"}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      )}

      {/* Loading */}
      {loadingPath && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-10 h-10 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm animate-pulse">Mapping your learning path…</p>
        </div>
      )}

      {/* Path visualization */}
      {path && !loadingPath && (
        <RoadmapTree path={path} onDiagnose={() => navigate("/diagnose")} />
      )}
    </main>
  );
}

/* ───────────────────── Roadmap Visualization ───────────────────── */

function RoadmapTree({ path, onDiagnose }) {
  const prereqs = path.path || [];
  const target = path.concept;

  /* Group nodes into tiers (reversed: foundation at bottom) */
  const tiers = [];
  if (prereqs.length === 0) {
    tiers.push({ name: "Target Concept", subtitle: "Where you want to reach", nodes: [{ ...target, isTarget: true }] });
  } else {
    /* target on top */
    tiers.push({ name: "Target Concept", subtitle: "Where you want to reach", nodes: [{ ...target, isTarget: true }] });
    /* intermediate prereqs (all middle ones) */
    if (prereqs.length > 1) {
      tiers.push({ name: "Intermediate", subtitle: "Building blocks for the target", nodes: prereqs.slice(0, -1).map((p) => ({ ...p })) });
    }
    /* foundation (last prereq = base) */
    tiers.push({ name: "Foundation", subtitle: "Where it all starts", nodes: [{ ...prereqs[prereqs.length - 1], isFoundation: true }] });
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {/* XP banner */}
      <div className="w-full rounded-xl bg-gradient-to-r from-amber-brand/10 via-cream-100 to-amber-brand/10 border border-amber-200 px-5 py-3.5 mb-8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-brand/20 text-amber-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">
            {prereqs.length} prerequisite{prereqs.length !== 1 ? "s" : ""} to master{" "}
            <span className="text-amber-brand">{target?.name}</span>
          </p>
          <p className="text-xs text-text-muted mt-0.5">Complete from bottom → top to unlock your target</p>
        </div>
        <span className="text-xs font-bold bg-amber-brand text-white px-2.5 py-1 rounded-full">
          +{(prereqs.length + 1) * 50} XP
        </span>
      </div>

      {/* Tiers */}
      {tiers.map((tier, ti) => {
        const palette = ti === 0
          ? { bg: "bg-amber-brand/5", border: "border-amber-brand", ring: "ring-amber-brand/20" }
          : ti === tiers.length - 1
            ? { bg: "bg-emerald-50", border: "border-emerald-300", ring: "ring-emerald-200" }
            : { bg: "bg-white", border: "border-gray-200", ring: "" };

        return (
          <div key={ti} className="w-full flex flex-col items-center">
            {/* Tier label */}
            <div className="w-full mb-3">
              <h3 className="text-sm font-bold text-text-primary">{tier.name}</h3>
              <p className="text-xs text-text-muted">{tier.subtitle}</p>
            </div>

            {/* Node cards grid */}
            <div className={`w-full grid gap-3 mb-2 ${tier.nodes.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {tier.nodes.map((node, ni) => {
                const isTarget = node.isTarget;
                const isFoundation = node.isFoundation;

                return (
                  <div
                    key={node.id || ni}
                    className={`relative rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
                      isTarget
                        ? "bg-amber-brand/5 border-amber-brand shadow-sm shadow-amber-brand/10"
                        : isFoundation
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Status badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isTarget ? "bg-amber-brand/20" : isFoundation ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        {isTarget ? (
                          <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.136M3 3h18M3 3L1.5 1.5M21 3l-1.664 9.136M21 3l1.5-1.5M9 12h6m-3-3v6m-6.336 2.864A9 9 0 1020.336 14.864" /></svg>
                        ) : isFoundation ? (
                          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTarget
                          ? "bg-amber-brand/20 text-amber-700"
                          : isFoundation
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                      }`}>
                        {isTarget ? "Target" : isFoundation ? "Foundation" : "Locked"}
                      </span>
                    </div>

                    <h4 className="font-bold text-text-primary text-sm leading-snug">
                      {node.name || PREREQ_LABELS[node.id] || node.id}
                    </h4>

                    {node.prerequisites && node.prerequisites.length > 0 && (
                      <p className="text-[11px] text-text-muted mt-1.5">
                        Requires: {node.prerequisites.map((p) => PREREQ_LABELS[p] || p).join(", ")}
                      </p>
                    )}

                    {/* XP reward */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-brand" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span className="text-[11px] font-semibold text-text-muted">+50 XP on mastery</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connector */}
            {ti < tiers.length - 1 && (
              <div className="flex flex-col items-center py-2">
                <div className="w-0.5 h-5 bg-gradient-to-b from-gray-300 to-gray-200 rounded-full" />
                <div className="w-6 h-6 rounded-full bg-cream-200 border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-text-muted text-[10px]">▼</span>
                </div>
                <div className="w-0.5 h-5 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full" />
              </div>
            )}
          </div>
        );
      })}

      {/* How to read callout */}
      <div className="w-full mt-6 rounded-2xl bg-cream-100 border border-cream-300 p-5">
        <h4 className="font-bold text-sm text-text-primary mb-2">How to read this roadmap</h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          Start from the <span className="font-semibold">Foundation</span> layer at the bottom and work your way up.
          Each concept must be mastered before unlocking dependent concepts above it.
          If a concept is marked as a <span className="font-semibold text-rose-500">Blocker</span>,
          it means the diagnostic mission detected a gap there. Complete the recommended lesson and verification quiz to clear it.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-6 w-full rounded-2xl bg-gradient-to-br from-amber-brand/10 via-cream-100 to-amber-brand/5 border border-amber-200 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-brand/20 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <p className="text-text-primary font-bold text-lg mb-1">
          Ready to find your gaps?
        </p>
        <p className="text-text-secondary text-sm mb-4 max-w-sm mx-auto">
          Run a diagnostic mission and Aarvana will pinpoint exactly which prerequisites need work.
        </p>
        <button
          onClick={onDiagnose}
          className="px-8 py-3 rounded-xl bg-amber-brand hover:bg-amber-hover font-bold text-sm transition-all active:scale-95 shadow-sm shadow-amber-brand/20"
        >
          Start Diagnostic
        </button>
      </div>
    </div>
  );
}
