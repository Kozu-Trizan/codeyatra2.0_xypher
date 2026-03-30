import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";
import { MOLECULE_DATA } from "./moleculeData";

/*
 * Molecular Structure 3D Visualiser – v2
 * Redesigned with auto-rotation, rim-light shading, ambient particles,
 * electron cloud overlay, animated bond pulse, and a polished quiz panel.
 */

/* ─── Atom palette ──── */
const EL_COLOR = {
  H: "#e2e8f0", C: "#1e293b", N: "#6366f1", O: "#ef4444", S: "#eab308",
  P: "#f97316", Cl: "#22c55e", F: "#a3e635", Br: "#b45309",
};
const EL_RADIUS = { H: 0.31, C: 0.77, N: 0.75, O: 0.73, S: 1.02, P: 1.06, Cl: 0.99, F: 0.64, Br: 1.14 };
const SCALE = 105;

/* ─── 3D rotation ──── */
function rot(x, y, z, rx, ry) {
  const cy2 = Math.cos(ry), sy = Math.sin(ry);
  let x1 = x * cy2 + z * sy, z1 = -x * sy + z * cy2;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx };
}

export default function MolecularStructure() {
  const { conceptId } = useParams();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const ambientRef = useRef([]);

  const { simulation, loading, error, trackInteraction, submitAnswer } = useSimulation(conceptId, "molecular_structure");

  const [moleculeKey, setMoleculeKey] = useState("H2O");
  const [style, setStyle] = useState("ball-and-stick");
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotation, setRotation] = useState({ x: -0.3, y: 0.4 });
  const [dragging, setDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const mol = MOLECULE_DATA[moleculeKey];

  // Spawn ambient particles
  useEffect(() => {
    ambientRef.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * 520, y: Math.random() * 420,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 2, a: Math.random(),
    }));
  }, []);

  /* ── Drawing loop ──────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    timeRef.current += 0.016;
    const t = timeRef.current;

    // Auto rotate
    if (autoRotate && !dragging) {
      setRotation((r) => ({ x: r.x, y: r.y + 0.008 }));
    }

    // ─ Background ─
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.8);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(0.5, "#0a0e1a");
    bg.addColorStop(1, "#030508");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Ambient floating particles
    const amb = ambientRef.current;
    for (const p of amb) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.globalAlpha = 0.15 + Math.sin(t + p.a * 10) * 0.1;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Subtle hexagonal background
    ctx.strokeStyle = "rgba(99,102,241,0.03)";
    ctx.lineWidth = 0.5;
    const hR = 50;
    for (let row = -1; row < H / (hR * 1.5) + 1; row++) {
      for (let col = -1; col < W / (hR * 1.73) + 1; col++) {
        const hx = col * hR * 1.73 + (row % 2) * hR * 0.866;
        const hy = row * hR * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          const px = hx + hR * 0.9 * Math.cos(a);
          const py = hy + hR * 0.9 * Math.sin(a);
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }

    // Project atoms
    const projected = mol.atoms.map((a) => {
      const p = rot(a.x, a.y, a.z, rotation.x, rotation.y);
      return { ...a, sx: cx + p.x * SCALE, sy: cy - p.y * SCALE, sz: p.z };
    });
    const sorted = [...projected].sort((a, b) => a.sz - b.sz);

    // ─ Electron cloud overlay ─
    if (style !== "wireframe") {
      const cloudR = Math.max(...mol.atoms.map((a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z))) * SCALE + 40;
      const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudR);
      cloud.addColorStop(0, "rgba(99,102,241,0.04)");
      cloud.addColorStop(0.7, "rgba(99,102,241,0.02)");
      cloud.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = cloud;
      ctx.beginPath(); ctx.arc(cx, cy, cloudR, 0, Math.PI * 2); ctx.fill();
    }

    // ─ Bonds with animated pulse ─
    if (style !== "space-filling") {
      ctx.lineCap = "round";
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i], b = projected[j];
          const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 1.8) {
            const bondGrad = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
            const ca = EL_COLOR[a.element] || "#aaa";
            const cb = EL_COLOR[b.element] || "#aaa";
            if (style === "wireframe") {
              bondGrad.addColorStop(0, ca + "88");
              bondGrad.addColorStop(1, cb + "88");
              ctx.lineWidth = 1.5;
            } else {
              // Animated glow pulse
              const pulseAlpha = Math.floor(130 + Math.sin(t * 3 + i + j) * 40).toString(16);
              bondGrad.addColorStop(0, ca + pulseAlpha);
              bondGrad.addColorStop(0.5, "#94a3b8" + pulseAlpha);
              bondGrad.addColorStop(1, cb + pulseAlpha);
              ctx.lineWidth = 5;
            }
            ctx.save();
            ctx.shadowBlur = style === "wireframe" ? 0 : 6;
            ctx.shadowColor = "rgba(148,163,184,0.3)";
            ctx.strokeStyle = bondGrad;
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // ─ Atoms with phong-style shading ─
    sorted.forEach((a) => {
      const baseR = EL_RADIUS[a.element] || 0.7;
      let r;
      if (style === "space-filling") r = baseR * SCALE * 0.9;
      else if (style === "wireframe") r = 5;
      else r = baseR * SCALE * 0.42;

      const depth = (a.sz + 2) / 4;
      const brightness = 0.55 + 0.45 * Math.max(0, Math.min(1, depth));
      const color = EL_COLOR[a.element] || "#aaa";

      // Outer glow
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = color + "44";

      // Multi-stop radial gradient for 3D sphere
      const hlX = a.sx - r * 0.3, hlY = a.sy - r * 0.3;
      const sphereG = ctx.createRadialGradient(hlX, hlY, r * 0.05, a.sx, a.sy, r);
      sphereG.addColorStop(0, "#ffffff66");
      sphereG.addColorStop(0.25, color + "ee");
      const midAlpha = Math.round(Math.min(255, 120 + brightness * 135)).toString(16).padStart(2, "0");
      sphereG.addColorStop(0.6, color + midAlpha);
      sphereG.addColorStop(1, color + "33");

      ctx.beginPath(); ctx.arc(a.sx, a.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereG; ctx.fill();

      // Rim light (top-right)
      const rimG = ctx.createRadialGradient(a.sx + r * 0.4, a.sy - r * 0.3, 0, a.sx, a.sy, r);
      rimG.addColorStop(0, "rgba(255,255,255,0.15)");
      rimG.addColorStop(0.5, "rgba(255,255,255,0)");
      rimG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(a.sx, a.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = rimG; ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = style === "wireframe" ? 0 : 1;
      ctx.stroke();
      ctx.restore();

      // Labels
      if (showLabels && r > 8) {
        ctx.fillStyle = a.element === "H" || a.element === "S" || a.element === "F" ? "#1e293b" : "#fff";
        ctx.font = `bold ${Math.max(12, r * 0.55)}px 'Inter',sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(a.element, a.sx, a.sy);
      }
    });

    // ─ Molecule name HUD ─
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.beginPath(); ctx.roundRect(12, 12, 100, 30, 8); ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, 12, 100, 30, 8); ctx.stroke();
    ctx.fillStyle = "#a5b4fc"; ctx.font = "bold 14px 'Inter',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(mol.formula, 62, 27);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    animRef.current = requestAnimationFrame(draw);
  }, [mol, rotation, style, showLabels, autoRotate, dragging]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* ── Mouse / touch rotation ── */
  const handlePointerDown = (e) => {
    setDragging(true);
    lastMouse.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 };
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;
    setRotation((r) => ({ x: r.x + (y - lastMouse.current.y) * 0.01, y: r.y + (x - lastMouse.current.x) * 0.01 }));
    lastMouse.current = { x, y };
  };
  const handlePointerUp = () => setDragging(false);

  /* ── Answers ── */
  const handleAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    trackInteraction?.("answer_change", { questionId: qId, value });
  };

  const handleSubmit = async () => {
    const qResults = {};
    let correct = 0;
    mol.questions.forEach((q) => {
      const ans = answers[q.id];
      if (q.type === "numeric") {
        qResults[q.id] = Math.abs(Number(ans) - q.correctAnswer) <= 2;
      } else {
        qResults[q.id] = ans === q.correctAnswer;
      }
      if (qResults[q.id]) correct++;
    });
    setResults(qResults); setSubmitted(true);
    const score = correct / mol.questions.length;
    setFeedback({
      type: score >= 0.8 ? "success" : score >= 0.5 ? "info" : "error",
      message: score >= 0.8 ? `Excellent! ${correct}/${mol.questions.length} correct!` : `${correct}/${mol.questions.length} correct. Rotate the model and study the structure.`,
    });
    if (submitAnswer) {
      try { await submitAnswer({ molecule: moleculeKey, answers, score }); } catch {}
    }
  };

  const resetQuiz = () => { setAnswers({}); setResults({}); setFeedback(null); setSubmitted(false); };

  const changeMolecule = (key) => {
    setMoleculeKey(key); resetQuiz();
    trackInteraction?.("molecule_change", { molecule: key });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-gray-500">Loading simulation...</span></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <SimulationContainer title={simulation?.title || "Molecular Structure 3D Visualiser"}>
      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 3D viewer ── */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* Molecule selector pills */}
          <div className="flex gap-2 mb-3 flex-wrap justify-center">
            {Object.keys(MOLECULE_DATA).map((key) => (
              <button key={key} onClick={() => changeMolecule(key)}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  moleculeKey === key
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-400 hover:text-white"
                }`}>
                {MOLECULE_DATA[key].formula}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <canvas ref={canvasRef} width={520} height={420}
            className="rounded-xl border border-indigo-500/20 cursor-grab active:cursor-grabbing touch-none w-full"
            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} />

          <p className="text-xs text-slate-500 mt-1">Drag to rotate {"\u00b7"} 3D molecular model</p>

          {/* Controls row */}
          <div className="flex gap-4 mt-3 flex-wrap justify-center items-center">
            {["ball-and-stick", "space-filling", "wireframe"].map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-300 hover:text-white transition-colors">
                <input type="radio" name="molStyle" value={s} checked={style === s}
                  className="accent-indigo-500"
                  onChange={() => { setStyle(s); trackInteraction?.("style_change", { style: s }); }} />
                <span className="capitalize">{s.replace(/-/g, " ")}</span>
              </label>
            ))}

            <div className="w-px h-5 bg-slate-700 mx-1" />

            <label className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-300">
              <input type="checkbox" checked={showLabels} onChange={() => setShowLabels((v) => !v)} className="accent-indigo-500" />
              Labels
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-300">
              <input type="checkbox" checked={autoRotate} onChange={() => setAutoRotate((v) => !v)} className="accent-indigo-500" />
              Auto-rotate
            </label>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs text-center w-full max-w-lg">
            {[
              ["Formula", mol.formula],
              ["Geometry", mol.geometry],
              ["Bond Angle", mol.bondAngle],
              ["Polarity", mol.polarity],
              ["Hybrid.", mol.hybridization],
            ].map(([label, val]) => (
              <div key={label} className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-2.5">
                <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{label}</div>
                <div className="text-slate-100 font-bold mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Questions panel ── */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <span className="text-lg">{"\ud83e\uddea"}</span> Questions {"\u2014"} {mol.formula}
          </h3>

          {mol.questions.map((q, qi) => (
            <div key={q.id} className={`p-4 rounded-xl border transition-all ${
              submitted
                ? results[q.id]
                  ? "border-emerald-500/60 bg-emerald-950/30"
                  : "border-red-500/60 bg-red-950/30"
                : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
            }`}>
              <p className="text-sm font-medium mb-2.5 text-slate-200">{qi + 1}. {q.text}</p>

              {q.type === "numeric" ? (
                <input type="number" value={answers[q.id] ?? ""} disabled={submitted}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                  placeholder={`Answer in ${q.unit || "units"}`} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button key={opt} disabled={submitted}
                      onClick={() => handleAnswer(q.id, opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        answers[q.id] === opt
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                          : "bg-slate-900 text-slate-300 border-slate-600 hover:border-indigo-400"
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {submitted && !results[q.id] && (
                <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1">
                  {"\u2717"} Correct: {q.correctAnswer}{q.unit ? ` ${q.unit}` : ""}
                </p>
              )}
              {submitted && results[q.id] && (
                <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  {"\u2713"} Correct!
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={handleSubmit}
              disabled={submitted || Object.keys(answers).length < mol.questions.length}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl font-bold hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 transition-all text-sm shadow-lg shadow-indigo-500/20">
              Submit
            </button>
            <button onClick={resetQuiz}
              className="flex-1 border border-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition text-sm text-slate-300">
              Reset
            </button>
          </div>
        </div>
      </div>
    </SimulationContainer>
  );
}
