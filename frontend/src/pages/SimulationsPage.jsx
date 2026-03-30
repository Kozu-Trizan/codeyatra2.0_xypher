import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SIM_META = {
  vector_decomposition: { icon: "🧭", color: "indigo", label: "Physics" },
  function_graphing:    { icon: "📈", color: "emerald", label: "Mathematics" },
  area_under_curve:     { icon: "📊", color: "violet", label: "Mathematics" },
  projectile_motion:    { icon: "🎯", color: "sky", label: "Physics" },
  pendulum_sim:         { icon: "🕐", color: "teal", label: "Physics" },
  wave_sim:             { icon: "🌊", color: "cyan", label: "Physics" },
  circuit_builder:      { icon: "⚡", color: "yellow", label: "Physics" },
  molecular_structure:  { icon: "🧪", color: "rose", label: "Chemistry" },
};

/* Route uses the simulation_type directly: /simulations/:simType/:conceptId */

export default function SimulationsPage() {
  const { authFetch } = useAuth();
  const [sims, setSims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/simulations");
        const json = await res.json();
        setSims(json.data?.simulations ?? json.data ?? json ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [authFetch]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading simulations…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Interactive Simulations</h1>
      <p className="text-gray-500 mb-8">Explore concepts through hands-on interactive experiments.</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sims.map((sim) => {
          const meta = SIM_META[sim.simulation_type] || { icon: "🔬", color: "gray", label: "Simulation" };
          const to = sim.simulation_type
            ? `/simulations/${sim.simulation_type}/${sim.concept_id}`
            : "#";
          return (
            <Link key={sim.id} to={to}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <span className="text-4xl mb-3">{meta.icon}</span>
              <span className={`text-xs font-semibold uppercase tracking-wider text-${meta.color}-500 mb-1`}>{meta.label}</span>
              <h2 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{sim.title}</h2>
              <p className="text-sm text-gray-500 mt-1 flex-1">{sim.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 gap-1 group-hover:gap-2 transition-all">
                Launch <span aria-hidden>→</span>
              </span>
            </Link>
          );
        })}

        {sims.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-12">No simulations available yet. Seed the database first.</p>
        )}
      </div>
    </div>
  );
}
