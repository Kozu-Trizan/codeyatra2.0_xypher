import { useParams, useNavigate } from "react-router-dom";
import VectorDecomposition from "../components/simulations/physics/VectorDecomposition";
import FunctionGraphing from "../components/simulations/mathematics/FunctionGraphing";
import AreaUnderCurves from "../components/simulations/mathematics/AreaUnderCurves";
import ProjectileMotion from "../components/simulations/physics/ProjectileMotion";
import PendulumSim from "../components/simulations/physics/PendulumSim";
import WaveSim from "../components/simulations/physics/WaveSim";
import CircuitBuilder from "../components/simulations/physics/CircuitBuilder";
import MolecularStructure from "../components/simulations/chemistry/MolecularStructure";

/* Maps route :type (simulation_type) directly to its component */
const COMPONENTS = {
  vector_decomposition: VectorDecomposition,
  function_graphing:    FunctionGraphing,
  area_under_curve:     AreaUnderCurves,
  projectile_motion:    ProjectileMotion,
  pendulum_sim:         PendulumSim,
  wave_sim:             WaveSim,
  circuit_builder:      CircuitBuilder,
  molecular_structure:  MolecularStructure,
};

const LABELS = {
  vector_decomposition: "Physics",
  function_graphing:    "Mathematics",
  area_under_curve:     "Mathematics",
  projectile_motion:    "Physics",
  pendulum_sim:         "Physics",
  wave_sim:             "Physics",
  circuit_builder:      "Physics",
  molecular_structure:  "Chemistry",
};

export default function SimulationDetailPage() {
  const { type, conceptId } = useParams();
  const navigate = useNavigate();

  const SimComponent = COMPONENTS[type];

  if (!SimComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl">🔬</div>
        <p className="text-red-600 font-bold text-lg">Unknown simulation type</p>
        <button
          onClick={() => navigate("/simulations")}
          className="px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-bold text-sm text-white transition-all"
        >
          Back to Simulations
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/simulations")}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Simulations
      </button>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-brand/10 border border-amber-200 px-3 py-1 rounded-full">
          {LABELS[type]} Simulation
        </span>
      </div>

      {/* Simulation Component */}
      <SimComponent conceptId={Number(conceptId)} />
    </div>
  );
}
