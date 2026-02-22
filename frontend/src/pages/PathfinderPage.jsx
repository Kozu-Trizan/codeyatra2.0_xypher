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
          <h2 className="text-3xl font-bold text-text-primary">
            Prerequisite Pathfinder
          </h2>
        </div>
        <p className="text-text-secondary text-sm">
          Choose a concept and discover the full chain of prerequisites you need
          to master it.
        </p>
      </div>

      {/* Concept picker */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-8">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Select a Physics concept
        </label>
        {loadingConcepts ? (
          <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPath(null);
                setError(null);
              }}
              className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-amber-brand transition-colors appearance-none"
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
              className="px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
            >
              {loadingPath ? "Finding…" : "Find Path →"}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Loading spinner */}
      {loadingPath && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />
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
      <div className="w-full rounded-xl bg-amber-brand/5 border border-amber-200 px-4 py-3 mb-6 text-sm text-amber-brand text-center">
        To master{" "}
        <span className="font-semibold text-text-primary">{path.concept?.name}</span>,
        you need {path.path?.length || 0} prerequisite
        {path.path?.length !== 1 ? "s" : ""}.
      </div>

      {allNodes.map((node, idx) => (
        <div key={node.id || idx} className="flex flex-col items-center w-full">
          {/* Node card */}
          <div
            className={`w-full rounded-2xl border p-4 flex items-center gap-4 ${
              node.isTarget
                ? "bg-amber-brand/10 border-amber-brand shadow-md shadow-amber-brand/10"
                : "bg-white border-gray-200"
            }`}
          >
            {/* Step number */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                node.isTarget
                  ? "bg-amber-brand text-text-primary"
                  : "bg-gray-100 text-text-secondary"
              }`}
            >
              {node.isTarget ? "★" : idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${
                  node.isTarget ? "text-text-primary" : "text-text-primary"
                }`}
              >
                {node.name || PREREQ_LABELS[node.id] || node.id}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {node.isTarget ? "Target concept" : "Prerequisite"}
              </p>
            </div>

            {!node.isTarget && (
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 border border-gray-300 text-text-secondary">
                Step {idx + 1}
              </span>
            )}
          </div>

          {/* Connector arrow (between nodes) */}
          {idx < allNodes.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <div className="w-px h-4 bg-gray-300" />
              <div className="text-text-muted text-xs">↓</div>
              <div className="w-px h-4 bg-gray-300" />
            </div>
          )}
        </div>
      ))}

      {/* CTA */}
      <div className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-brand/10 to-cream-200 border border-amber-200 p-5 text-center">
        <p className="text-text-primary font-semibold mb-1">
          Find out which of these you actually need to review
        </p>
        <p className="text-text-secondary text-sm mb-4">
          Run the diagnostic and Aarvana will pinpoint your exact gaps.
        </p>
        <button
          onClick={onDiagnose}
          className="px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-semibold text-sm transition-colors"
        >
          Run Diagnosis →
        </button>
      </div>
    </div>
  );
}
