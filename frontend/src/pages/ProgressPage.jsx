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

const STATUS_META = {
  passed: {
    label: "Mastered",
    emoji: "✅",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-400",
    xp: 100,
  },
  needs_review: {
    label: "Needs Review",
    emoji: "🔄",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
    xp: 30,
  },
  not_started: {
    label: "Not Started",
    emoji: "⏳",
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
    dot: "bg-gray-300",
    xp: 0,
  },
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100];
const LEVEL_NAMES = ["Novice", "Explorer", "Scholar", "Expert", "Master", "Legend", "Grandmaster"];

function getLevel(xp) {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i; break; }
  }
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level] + 500;
  const currentBase = LEVEL_THRESHOLDS[level];
  const progress = ((xp - currentBase) / (nextThreshold - currentBase)) * 100;
  return { level, name: LEVEL_NAMES[level] || "Legend", progress: Math.min(progress, 100), nextXp: nextThreshold };
}

export default function ProgressPage() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  const [progressData, setProgressData] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      authFetch(`/api/progress/${user.id}`).then((r) => r.ok ? r.json() : null),
      authFetch("/api/concepts").then((r) => r.ok ? r.json() : []),
    ])
      .then(([prog, concs]) => {
        setProgressData(prog?.data ?? prog);
        const list = concs?.data?.concepts ?? concs ?? [];
        setConcepts(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">📊</span>
          </div>
          <p className="text-text-secondary text-sm animate-pulse">Loading your progress…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl">⚠</div>
        <p className="text-red-600 font-semibold">Failed to load progress</p>
        <p className="text-text-muted text-sm">{error}</p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const raw = progressData?.progress || {};
  const statusMap = {};
  Object.entries(raw).forEach(([conceptId, entry]) => {
    statusMap[conceptId] = entry.status || "not_started";
  });

  const rows = concepts.map((c) => ({
    ...c,
    status: statusMap[c.id] || "not_started",
    diagnosedAt: raw[c.id]?.diagnosed_at || null,
  }));

  const passed = rows.filter((r) => r.status === "passed").length;
  const reviewed = rows.filter((r) => r.status === "needs_review").length;
  const notStarted = rows.length - passed - reviewed;
  const totalXp = passed * 100 + reviewed * 30;
  const levelInfo = getLevel(totalXp);

  /* Achievements */
  const achievements = [];
  if (passed >= 1) achievements.push({ emoji: "🌟", label: "First Mastery", desc: "Mastered your first concept" });
  if (passed >= 3) achievements.push({ emoji: "🔥", label: "On Fire", desc: "Mastered 3 concepts" });
  if (passed >= 5) achievements.push({ emoji: "🏆", label: "Champion", desc: "Mastered 5 concepts" });
  if (reviewed >= 1) achievements.push({ emoji: "🔍", label: "Detective", desc: "Diagnosed your first gap" });
  if (passed + reviewed >= rows.length && rows.length > 0) achievements.push({ emoji: "🗺️", label: "Explorer", desc: "Diagnosed every concept" });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-amber-brand/15 flex items-center justify-center text-xl">📊</div>
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">My Progress</h2>
          <p className="text-text-secondary text-sm">Track your learning journey and earn XP</p>
        </div>
      </div>

      {/* Level & XP card */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-brand/5 via-cream-100 to-amber-brand/5 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-brand flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-amber-brand/30">
              {levelInfo.level}
            </div>
            <div>
              <p className="font-extrabold text-text-primary">{levelInfo.name}</p>
              <p className="text-xs text-text-muted">Level {levelInfo.level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-amber-brand">{totalXp} XP</p>
            <p className="text-[11px] text-text-muted">{levelInfo.nextXp - totalXp} XP to next level</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="h-3 rounded-full bg-white/60 border border-amber-200/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-brand to-amber-400 transition-all duration-1000 ease-out"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard value={passed} label="Mastered" emoji="✅" color="text-emerald-600" bgColor="bg-emerald-50 border-emerald-200" />
        <StatCard value={reviewed} label="Reviewing" emoji="🔄" color="text-amber-600" bgColor="bg-amber-50 border-amber-200" />
        <StatCard value={notStarted} label="Remaining" emoji="⏳" color="text-gray-500" bgColor="bg-gray-50 border-gray-200" />
      </div>

      {/* Overall coverage bar */}
      {rows.length > 0 && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 p-4">
          <div className="flex justify-between text-xs text-text-muted mb-2">
            <span className="font-semibold">Mission Coverage</span>
            <span>{passed + reviewed}/{rows.length} ({Math.round(((passed + reviewed) / rows.length) * 100)}%)</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
            <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${(passed / rows.length) * 100}%` }} />
            <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${(reviewed / rows.length) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Mastered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Reviewing</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200" /> Remaining</span>
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>🏅</span> Achievements
          </h3>
          <div className="flex gap-2 flex-wrap">
            {achievements.map((a) => (
              <div key={a.label} className="rounded-xl border border-amber-200 bg-amber-brand/5 px-3 py-2 flex items-center gap-2 hover:shadow-sm transition-all">
                <span className="text-lg">{a.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-text-primary">{a.label}</p>
                  <p className="text-[10px] text-text-muted">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concepts list */}
      <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
        <span>📋</span> All Missions
      </h3>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const meta = STATUS_META[row.status] || STATUS_META.not_started;
          return (
            <div key={row.id}
              className={`rounded-2xl border bg-white p-4 flex items-center gap-4 transition-all hover:shadow-sm ${
                row.status === "passed" ? "border-emerald-200" : "border-gray-200"
              }`}>
              {/* Status icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                row.status === "passed" ? "bg-emerald-100" : row.status === "needs_review" ? "bg-amber-100" : "bg-gray-100"
              }`}>
                {meta.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm truncate">{row.name}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {row.class ? `Class ${row.class}` : ""}
                  {row.diagnosedAt ? ` · Diagnosed ${new Date(row.diagnosedAt).toLocaleDateString()}` : ""}
                </p>
              </div>

              {/* XP */}
              {meta.xp > 0 && (
                <span className="text-[11px] font-bold text-amber-brand">+{meta.xp} XP</span>
              )}

              {/* Badge */}
              <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>

              {/* Action */}
              {row.status !== "passed" && (
                <button onClick={() => navigate("/diagnose")}
                  className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-amber-brand hover:bg-amber-hover text-white font-bold transition-all active:scale-95">
                  🎯 Diagnose
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 bg-cream-50">
          <span className="text-4xl block mb-3">🚀</span>
          <p className="text-text-secondary font-semibold mb-2">No missions completed yet</p>
          <p className="text-text-muted text-sm mb-4">Start your first diagnostic to earn XP and track progress!</p>
          <button onClick={() => navigate("/diagnose")}
            className="px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-bold text-sm text-white transition-all active:scale-95 shadow-sm shadow-amber-brand/20">
            🎯 Start First Mission
          </button>
        </div>
      )}

      {/* Motivational CTA */}
      {rows.length > 0 && notStarted > 0 && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-brand/10 via-cream-100 to-amber-brand/5 border border-amber-200 p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-brand/20 flex items-center justify-center text-2xl shrink-0">🔥</div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-text-primary">
              {notStarted} mission{notStarted !== 1 ? "s" : ""} remaining!
            </p>
            <p className="text-text-secondary text-sm mt-0.5">
              Complete them all to reach {LEVEL_NAMES[Math.min(levelInfo.level + 1, LEVEL_NAMES.length - 1)]} level.
            </p>
          </div>
          <button onClick={() => navigate("/diagnose")}
            className="shrink-0 px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-bold text-sm text-white transition-all active:scale-95 shadow-sm shadow-amber-brand/20">
            Continue →
          </button>
        </div>
      )}
    </main>
  );
}

function StatCard({ value, label, emoji, color, bgColor }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${bgColor}`}>
      <span className="text-lg block mb-1">{emoji}</span>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-text-muted text-[11px] font-semibold mt-0.5">{label}</p>
    </div>
  );
}
