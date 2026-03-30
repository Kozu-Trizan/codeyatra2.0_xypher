import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();

  const [concepts, setConcepts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [path, setPath] = useState(null);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/api/concepts?syllabus_only=true")
      .then((r) => r.json())
      .then((d) => { const list = d?.data?.concepts ?? d ?? []; setConcepts(Array.isArray(list) ? list : []); setLoadingConcepts(false); })
      .catch(() => setLoadingConcepts(false));
  }, []);

  /* Auto-fetch path if concept query param is set */
  useEffect(() => {
    const conceptParam = searchParams.get("concept");
    if (conceptParam && !loadingConcepts) {
      setSelectedId(conceptParam);
      fetchPath(conceptParam);
    }
  }, [searchParams, loadingConcepts]);

  const fetchPath = async (id) => {
    if (!id) return;
    setLoadingPath(true);
    setPath(null);
    setError(null);
    try {
      const res = await authFetch(`/api/concepts/${id}/path`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPath(data?.data ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPath(false);
    }
  };

  const handleFind = () => fetchPath(selectedId);

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
                <option key={c.id} value={c.id}>{c.name}{c.neb_class ? ` (Class ${c.neb_class})` : ""}</option>
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

function RoadmapTree({ path }) {
  const allNodes = path.prerequisite_chain || [];
  const visualNodes = [...allNodes].reverse(); // [Target, ..., Foundation]
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div className="relative pb-20">
      {/* Resource Modal */}
      {selectedNode && (
        <ResourceModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* XP banner */}
      <div className="w-full rounded-xl bg-gradient-to-r from-amber-brand/10 via-cream-100 to-amber-brand/10 border border-amber-200 px-5 py-3.5 mb-12 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-brand/20 text-amber-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">
            {allNodes.length - 1} prerequisite{allNodes.length - 1 !== 1 ? "s" : ""} to master{" "}
            <span className="text-amber-brand">{visualNodes[0]?.name}</span>
          </p>
          <p className="text-xs text-text-muted mt-0.5">Follow the winding path from bottom to top</p>
        </div>
      </div>

      {/* Winding zigzag path */}
      <div className="relative w-full max-w-lg mx-auto" style={{ minHeight: visualNodes.length * 140 }}>
        {/* SVG connector lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {visualNodes.map((_, index) => {
            if (index >= visualNodes.length - 1) return null;
            const y1 = 60 + index * 130;
            const y2 = 60 + (index + 1) * 130;
            const isEven = index % 2 === 0;
            const isNextEven = (index + 1) % 2 === 0;
            // x positions: even = 30%, odd = 70%
            const x1Pct = isEven ? 30 : 70;
            const x2Pct = isNextEven ? 30 : 70;
            return (
              <path
                key={index}
                d={`M ${x1Pct}% ${y1} C ${x1Pct}% ${y1 + 65}, ${x2Pct}% ${y2 - 65}, ${x2Pct}% ${y2}`}
                fill="none"
                stroke="url(#pathGrad)"
                strokeWidth="3"
                strokeDasharray="8 6"
                opacity="0.6"
              />
            );
          })}
          <defs>
            <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes */}
        {visualNodes.map((node, index) => {
          const isTarget = index === 0;
          const isFoundation = index === visualNodes.length - 1;
          const isEven = index % 2 === 0;

          // Zigzag: even indices left side, odd indices right side
          const alignClass = isEven ? "mr-auto" : "ml-auto";
          const topPos = 30 + index * 130;

          return (
            <div
              key={node.id || index}
              className={`absolute ${alignClass}`}
              style={{
                top: topPos,
                left: isEven ? "8%" : "auto",
                right: isEven ? "auto" : "8%",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => setSelectedNode(node)}
                className={`group relative flex items-center gap-3 transition-all hover:scale-105 active:scale-95 ${
                  isEven ? "flex-row" : "flex-row-reverse"
                }`}
              >
                {/* Node circle */}
                <div
                  className={`w-16 h-16 rounded-full border-[3px] flex items-center justify-center shadow-lg transition-all group-hover:shadow-xl ${
                    isTarget
                      ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-white shadow-amber-500/30"
                      : isFoundation
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-emerald-500/30"
                      : "bg-gradient-to-br from-white to-gray-50 border-gray-300 text-text-primary group-hover:border-amber-brand shadow-gray-200/50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-[8px] font-bold uppercase tracking-wider opacity-80">
                      {isTarget ? "GOAL" : isFoundation ? "START" : `${visualNodes.length - index}`}
                    </div>
                    <svg
                      className={`w-4 h-4 mx-auto ${isTarget || isFoundation ? "text-white" : "text-amber-brand"}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isTarget ? (
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      ) : isFoundation ? (
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      ) : (
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                </div>

                {/* Label card */}
                <div
                  className={`bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm group-hover:shadow-md group-hover:border-amber-brand/40 transition-all max-w-[180px] ${
                    isEven ? "text-left" : "text-right"
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                    isTarget ? "text-amber-600" : isFoundation ? "text-emerald-600" : "text-text-muted"
                  }`}>
                    {isTarget ? "Target Concept" : isFoundation ? "Foundation" : `Step ${visualNodes.length - index}`}
                  </div>
                  <div className="text-sm font-extrabold text-text-primary leading-snug line-clamp-2">
                    {node.name}
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    Tap for resources
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourceModal({ node, onClose }) {
    const { authFetch } = useAuth();
    const navigate = useNavigate();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    const TYPE_ICONS = {
      video: "\ud83c\udfa5",
      article: "\ud83d\udcdd",
      exercise: "\ud83c\udfaf",
      textbook: "\ud83d\udcda",
      interactive: "\ud83d\udd2c",
      quiz: "\u2753",
    };

    useEffect(() => {
        authFetch(`/api/resources?concept_id=${node.id}`)
            .then(r => r.json())
            .then(d => {
                setResources(d.data?.resources || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [node.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-amber-brand p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">{node.name}</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Quick actions */}
                    <div className="flex gap-2 mb-5">
                        <button
                            onClick={() => { onClose(); navigate(`/learn/${node.id}`); }}
                            className="flex-1 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover text-white text-sm font-bold transition-all active:scale-95"
                        >
                            Start Learning
                        </button>
                        <button
                            onClick={() => { onClose(); navigate(`/pathfinder?concept=${node.id}`); }}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 hover:border-amber-brand/40 text-text-secondary text-sm font-semibold transition-all"
                        >
                            View Path
                        </button>
                    </div>

                    <h4 className="flex items-center gap-2 font-bold text-text-primary mb-4">
                        <span className="w-2 h-6 bg-amber-brand rounded-full"/>
                        Recommended Resources
                    </h4>
                    
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-amber-brand border-t-transparent rounded-full animate-spin"/></div>
                    ) : resources.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
                            <p>No specific resources found for this concept yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resources.map((res, i) => (
                                <a 
                                    key={i} 
                                    href={res.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block p-4 rounded-xl border border-gray-200 hover:border-amber-brand hover:bg-amber-brand/5 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[res.type?.toLowerCase()] || "\ud83d\udcce"}</span>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-text-primary group-hover:text-amber-700">{res.title}</p>
                                            <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">{res.type}</p>
                                        </div>
                                        <svg className="w-5 h-5 text-gray-300 group-hover:text-amber-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

