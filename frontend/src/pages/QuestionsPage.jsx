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

const CLASS_COLORS = {
  11: "text-emerald-400 bg-emerald-900/30 border-emerald-800",
  12: "text-violet-400 bg-violet-900/30 border-violet-800",
};

export default function QuestionsPage() {
  const { authFetch } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "11" | "12"
  const navigate = useNavigate();

  useEffect(() => {
    authFetch("/api/concepts")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setConcepts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "all"
      ? concepts
      : concepts.filter((c) => String(c.class) === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading concepts…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center text-2xl">
          ⚠
        </div>
        <p className="text-red-400 font-medium">Could not load concepts</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <p className="text-slate-500 text-sm">
          Make sure the backend is running on{" "}
          <span className="text-indigo-400 font-mono">localhost:5000</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">
            Physics Concepts
          </h2>
          <p className="text-slate-400 text-sm">
            {concepts.length} topic{concepts.length !== 1 ? "s" : ""} available
            — click Diagnose to find your prerequisite gaps
          </p>
        </div>

        {/* Class filter */}
        <div className="flex gap-2">
          {["all", "11", "12"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                filter === f
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? "All Classes" : `Class ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Concepts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No concepts found for this filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              onDiagnose={() => navigate("/diagnose")}
            />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-800/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">Not sure where to start?</p>
          <p className="text-slate-400 text-sm mt-0.5">
            Let SikshyaMap detect which prerequisites you're missing.
          </p>
        </div>
        <button
          onClick={() => navigate("/diagnose")}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-colors"
        >
          Run Full Diagnosis →
        </button>
      </div>
    </main>
  );
}

function ConceptCard({ concept, onDiagnose }) {
  const classStyle =
    CLASS_COLORS[concept.class] ||
    "text-slate-400 bg-slate-800/30 border-slate-700";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-white leading-snug">{concept.name}</h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${classStyle}`}
        >
          Class {concept.class}
        </span>
      </div>

      {/* Description */}
      {concept.description && (
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {concept.description}
        </p>
      )}

      {/* Prerequisites */}
      {concept.prerequisites && concept.prerequisites.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">
            Prerequisites
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concept.prerequisites.map((p) => (
              <span
                key={p}
                className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300"
              >
                {PREREQ_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnose button */}
      <button
        onClick={onDiagnose}
        className="mt-auto w-full rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-700 hover:border-indigo-500 text-indigo-300 hover:text-white py-2 text-sm font-semibold transition-all"
      >
        Diagnose this concept →
      </button>
    </div>
  );
}
  );
}
