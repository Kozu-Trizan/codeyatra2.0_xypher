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

export default function PathfinderPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [concepts, setConcepts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [path, setPath] = useState(null);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [error, setError] = useState(null);

  // Load concepts for the dropdown
  useEffect(() => {
    authFetch("/api/concepts")
      .then((r) => r.json())
      .then((data) => {
        setConcepts(data);
        setLoadingConcepts(false);
      })
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
      setPath(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPath(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🗺</span>
          <h2 className="text-3xl font-bold text-white">
            Prerequisite Pathfinder
          </h2>
        </div>
        <p className="text-slate-400 text-sm">
          Choose a concept and discover the full chain of prerequisites you need
          to master it.
        </p>
      </div>

      {/* Concept picker */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select a Physics concept
        </label>
        {loadingConcepts ? (
          <div className="h-10 rounded-lg bg-slate-800 animate-pulse" />
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPath(null);
                setError(null);
              }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="">— Pick a concept —</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Class {c.class})
                </option>
              ))}
            </select>
            <button
              onClick={handleFind}
              disabled={!selectedId || loadingPath}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
            >
              {loadingPath ? "Finding…" : "Find Path →"}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading spinner */}
      {loadingPath && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Path visualization */}
      {path && !loadingPath && (
        <PathTree path={path} onDiagnose={() => navigate("/diagnose")} />
      )}
    </main>
  );
}

function PathTree({ path, onDiagnose }) {
  const allNodes = [
    ...(path.path || []).map((p) => ({ ...p, isPrereq: true })),
    { id: path.concept?.id, name: path.concept?.name, isTarget: true },
  ];

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Info banner */}
      <div className="w-full rounded-xl bg-indigo-900/20 border border-indigo-800/50 px-4 py-3 mb-6 text-sm text-indigo-300 text-center">
        To master{" "}
        <span className="font-semibold text-white">{path.concept?.name}</span>,
        you need {path.path?.length || 0} prerequisite
        {path.path?.length !== 1 ? "s" : ""}.
      </div>

      {allNodes.map((node, idx) => (
        <div key={node.id || idx} className="flex flex-col items-center w-full">
          {/* Node card */}
          <div
            className={`w-full rounded-2xl border p-4 flex items-center gap-4 ${
              node.isTarget
                ? "bg-indigo-900/40 border-indigo-600 shadow-lg shadow-indigo-900/30"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            {/* Step number */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                node.isTarget
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {node.isTarget ? "★" : idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${
                  node.isTarget ? "text-white" : "text-slate-200"
                }`}
              >
                {node.name || PREREQ_LABELS[node.id] || node.id}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {node.isTarget ? "Target concept" : "Prerequisite"}
              </p>
            </div>

            {!node.isTarget && (
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                Step {idx + 1}
              </span>
            )}
          </div>

          {/* Connector arrow (between nodes) */}
          {idx < allNodes.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <div className="w-px h-4 bg-slate-700" />
              <div className="text-slate-600 text-xs">↓</div>
              <div className="w-px h-4 bg-slate-700" />
            </div>
          )}
        </div>
      ))}

      {/* CTA */}
      <div className="mt-8 w-full rounded-2xl bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-800/50 p-5 text-center">
        <p className="text-white font-semibold mb-1">
          Find out which of these you actually need to review
        </p>
        <p className="text-slate-400 text-sm mb-4">
          Run the diagnostic and SikshyaMap will pinpoint your exact gaps.
        </p>
        <button
          onClick={onDiagnose}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-colors"
        >
          Run Diagnosis →
        </button>
      </div>
    </div>
  );
}
