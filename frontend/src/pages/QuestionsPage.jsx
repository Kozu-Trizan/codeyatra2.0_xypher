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

const DIFFICULTY_BADGES = {
  easy:   { emoji: "🟢", label: "Beginner", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { emoji: "🟡", label: "Explorer", color: "bg-amber-100 text-amber-700 border-amber-200" },
  hard:   { emoji: "🔴", label: "Master",   color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function QuestionsPage() {
  const { authFetch } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    authFetch("/api/concepts")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data?.data?.concepts ?? data ?? [];
        setConcepts(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = concepts
    .filter((c) => filter === "all" || String(c.class) === filter)
    .filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">🐥</span>
          </div>
          <p className="text-text-secondary text-sm animate-pulse">Preparing your missions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl">⚠</div>
        <p className="text-red-600 font-semibold">Could not load missions</p>
        <p className="text-text-muted text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-brand/15 flex items-center justify-center text-xl">📚</div>
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Missions
            </h2>
            <p className="text-text-secondary text-sm">
              {concepts.length} quest{concepts.length !== 1 ? "s" : ""} available — complete them to earn XP
            </p>
          </div>
        </div>

        {/* XP summary pill */}
        <div className="flex items-center gap-2 bg-amber-brand/10 border border-amber-200 rounded-full px-4 py-2">
          <span className="text-amber-brand text-sm">⭐</span>
          <span className="text-sm font-bold text-amber-700">{concepts.length * 100} XP</span>
          <span className="text-xs text-text-muted">available</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search missions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-brand/30 focus:border-amber-brand transition-all"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {["all", "11", "12"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                filter === f
                  ? "bg-amber-brand border-amber-brand text-white shadow-sm shadow-amber-brand/20"
                  : "bg-white border-gray-200 text-text-secondary hover:border-amber-brand/40 hover:text-text-primary"
              }`}
            >
              {f === "all" ? "All Quests" : `Class ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Concepts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-4xl block mb-3">🔍</span>
          <p className="text-text-muted font-medium">No missions found</p>
          <p className="text-text-muted text-sm mt-1">Try a different filter or search term</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((concept, i) => (
            <MissionCard
              key={concept.id}
              concept={concept}
              index={i}
              onDiagnose={() => navigate("/diagnose")}
              onPath={() => navigate("/pathfinder")}
            />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 rounded-2xl bg-gradient-to-br from-amber-brand/10 via-cream-100 to-amber-brand/5 border border-amber-200 p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-brand/20 flex items-center justify-center text-2xl shrink-0">🧭</div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold text-text-primary">Not sure where to start?</p>
          <p className="text-text-secondary text-sm mt-0.5">
            Let Aarvana detect which prerequisites you're missing and build your learning path.
          </p>
        </div>
        <button
          onClick={() => navigate("/diagnose")}
          className="shrink-0 px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-bold text-sm transition-all active:scale-95 shadow-sm shadow-amber-brand/20"
        >
          🎯 Run Diagnosis
        </button>
      </div>
    </main>
  );
}

function MissionCard({ concept, index, onDiagnose, onPath }) {
  const diff = DIFFICULTY_BADGES[concept.difficulty] || DIFFICULTY_BADGES.medium;
  const prereqCount = concept.prerequisites?.length || 0;

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:border-amber-brand/40 hover:shadow-md hover:shadow-amber-brand/5 transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center text-lg font-bold text-amber-700">
            {String(index + 1).padStart(2, "0")}
          </div>
          <div>
            <h3 className="font-bold text-text-primary leading-snug text-sm group-hover:text-amber-700 transition-colors">
              {concept.name}
            </h3>
            {concept.class && (
              <span className="text-[11px] text-text-muted">Class {concept.class}</span>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${diff.color}`}>
          {diff.emoji} {diff.label}
        </span>
      </div>

      {/* Description */}
      {concept.description && (
        <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{concept.description}</p>
      )}

      {/* Prerequisites as chips */}
      {prereqCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {concept.prerequisites.map((p) => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-cream-200 border border-cream-300 text-text-secondary font-medium">
              {PREREQ_LABELS[p] || p}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">⭐ <span className="font-semibold">100 XP</span></span>
          {prereqCount > 0 && (
            <span className="flex items-center gap-1">🔗 {prereqCount} prereq{prereqCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPath}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 hover:border-amber-brand/40 text-text-secondary hover:text-amber-700 font-semibold transition-all"
          >
            🗺️ Path
          </button>
          <button
            onClick={onDiagnose}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-brand hover:bg-amber-hover text-white font-bold transition-all active:scale-95"
          >
            🎯 Diagnose
          </button>
        </div>
      </div>
    </div>
  );
}
