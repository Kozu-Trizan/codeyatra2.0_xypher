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
    label: "Passed",
    color: "text-emerald-600",
    bg: "bg-emerald-100 border-emerald-200",
    dot: "bg-emerald-400",
  },
  needs_review: {
    label: "Needs Review",
    color: "text-amber-brand",
    bg: "bg-amber-100 border-amber-200",
    dot: "bg-amber-400",
  },
  not_started: {
    label: "Not Started",
    color: "text-text-secondary",
    bg: "bg-gray-100 border-gray-300",
    dot: "bg-gray-400",
  },
};

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
      authFetch(`/api/progress/${user.id}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      authFetch("/api/concepts").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([prog, concs]) => {
        setProgressData(prog);
        setConcepts(concs);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Loading your progress…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-red-500 font-medium">Failed to load progress</p>
        <p className="text-text-muted text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Build a map of concept_id → status from progressData
  const raw = progressData?.progress || {};
  const statusMap = {};
  Object.entries(raw).forEach(([conceptId, entry]) => {
    statusMap[conceptId] = entry.status || "not_started";
  });

  // Merge with full concepts list
  const rows = concepts.map((c) => ({
    ...c,
    status: statusMap[c.id] || "not_started",
    diagnosedAt: raw[c.id]?.diagnosed_at || null,
  }));

  const passed = rows.filter((r) => r.status === "passed").length;
  const reviewed = rows.filter((r) => r.status === "needs_review").length;
  const total = rows.length;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-3xl font-bold text-text-primary">My Progress</h2>
        </div>
        <p className="text-text-secondary text-sm">
          Track which concepts you've been diagnosed on and where your gaps are.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={passed} label="Passed" color="text-emerald-600" />
        <StatCard value={reviewed} label="Need Review" color="text-amber-brand" />
        <StatCard
          value={total - passed - reviewed}
          label="Not Started"
          color="text-text-secondary"
        />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>Overall coverage</span>
            <span>
              {passed + reviewed}/{total} concepts diagnosed
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-brand transition-all duration-700"
              style={{
                width: `${Math.round(((passed + reviewed) / total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Concepts list */}
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const meta = STATUS_META[row.status] || STATUS_META.not_started;
          return (
            <div
              key={row.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-4"
            >
              {/* Status dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`}
              />

              {/* Name + class */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{row.name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Class {row.class}
                  {row.diagnosedAt
                    ? ` · Last diagnosed ${new Date(row.diagnosedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              {/* Status badge */}
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}
              >
                {meta.label}
              </span>

              {/* Action */}
              {row.status !== "passed" && (
                <button
                  onClick={() => navigate("/diagnose")}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-brand/10 hover:bg-amber-brand border border-amber-brand hover:border-amber-brand text-amber-brand hover:text-text-primary transition-all font-medium"
                >
                  Diagnose
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary mb-4">No diagnostics run yet.</p>
          <button
            onClick={() => navigate("/diagnose")}
            className="px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-semibold text-sm transition-colors"
          >
            Start Your First Diagnosis →
          </button>
        </div>
      )}

      {/* Motivational CTA */}
      {rows.length > 0 && total - passed - reviewed > 0 && (
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-amber-brand/10 to-cream-200 border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-text-primary">
              {total - passed - reviewed} concept
              {total - passed - reviewed !== 1 ? "s" : ""} left to explore
            </p>
            <p className="text-text-secondary text-sm mt-0.5">
              Keep diagnosing to complete your map.
            </p>
          </div>
          <button
            onClick={() => navigate("/diagnose")}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-semibold text-sm transition-colors"
          >
            Continue →
          </button>
        </div>
      )}
    </main>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-text-secondary text-xs mt-1">{label}</p>
    </div>
  );
}
