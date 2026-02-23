import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";
import { MOLECULE_DATA } from "./moleculeData";

/* ---------- Atom colours & radii ---------- */
const ELEMENT_COLORS = {
  H: "#FFFFFF", C: "#333333", N: "#3050F8", O: "#FF0D0D", S: "#FFFF30",
  P: "#FF8000", Cl: "#1FF01F", F: "#90E050", Br: "#A62929",
};
const ELEMENT_RADII = { H: 0.31, C: 0.77, N: 0.75, O: 0.73, S: 1.02, P: 1.06, Cl: 0.99, F: 0.64, Br: 1.14 };
const SCALE = 100; // Å → px

/* ---------- 3‑D rotation helpers (Euler‑ish Y then X) ---------- */
function rotatePoint(x, y, z, rotX, rotY) {
  // Y-axis rotation
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  let x1 = x * cosY + z * sinY;
  let z1 = -x * sinY + z * cosY;
  // X-axis rotation
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  let y1 = y * cosX - z1 * sinX;
  let z2 = y * sinX + z1 * cosX;
  return { x: x1, y: y1, z: z2 };
}

/* ---------- Component ---------- */
export default function MolecularStructure() {
  const { conceptId } = useParams();
  const canvasRef = useRef(null);

  /* simulation hook */
  const { simulation, interactionId, loading, error, trackInteraction, submitAnswer } = useSimulation(conceptId, "molecular_structure");

  /* state */
  const [moleculeKey, setMoleculeKey] = useState("H2O");
  const [style, setStyle] = useState("ball-and-stick"); // ball-and-stick | space-filling | wireframe
  const [showLabels, setShowLabels] = useState(true);
  const [rotation, setRotation] = useState({ x: -0.3, y: 0.4 });
  const [dragging, setDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  /* answers */
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const mol = MOLECULE_DATA[moleculeKey];

  /* ---------- Drawing ---------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    // project atoms
    const projected = mol.atoms.map((a) => {
      const p = rotatePoint(a.x, a.y, a.z, rotation.x, rotation.y);
      return { ...a, sx: cx + p.x * SCALE, sy: cy - p.y * SCALE, sz: p.z };
    });

    // sort by depth (back → front)
    const sorted = [...projected].sort((a, b) => a.sz - b.sz);

    // draw bonds first
    if (style !== "space-filling") {
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i], b = projected[j];
          const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 1.8) {
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = "#888";
            ctx.lineWidth = style === "wireframe" ? 2 : 4;
            ctx.stroke();
          }
        }
      }
    }

    // draw atoms
    sorted.forEach((a) => {
      const baseR = (ELEMENT_RADII[a.element] || 0.7);
      let r;
      if (style === "space-filling") r = baseR * SCALE * 0.9;
      else if (style === "wireframe") r = 4;
      else r = baseR * SCALE * 0.4;

      const depth = (a.sz + 2) / 4; // normalise 0–1
      const brightness = 0.6 + 0.4 * Math.max(0, Math.min(1, depth));

      ctx.beginPath();
      ctx.arc(a.sx, a.sy, r, 0, Math.PI * 2);

      const color = ELEMENT_COLORS[a.element] || "#AAAAAA";
      // lighten based on depth
      ctx.fillStyle = color;
      ctx.globalAlpha = brightness;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (showLabels) {
        ctx.fillStyle = a.element === "H" ? "#333" : "#FFF";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(a.element, a.sx, a.sy);
      }
    });
  }, [mol, rotation, style, showLabels]);

  useEffect(() => { draw(); }, [draw]);

  /* ---------- Mouse / touch rotation ---------- */
  const handlePointerDown = (e) => {
    setDragging(true);
    lastMouse.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 };
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;
    const dx = x - lastMouse.current.x;
    const dy = y - lastMouse.current.y;
    setRotation((r) => ({ x: r.x + dy * 0.01, y: r.y + dx * 0.01 }));
    lastMouse.current = { x, y };
  };
  const handlePointerUp = () => setDragging(false);

  /* ---------- Answer handling ---------- */
  const handleAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    trackInteraction?.("answer_change", { questionId: qId, value });
  };

  const handleSubmit = async () => {
    // local validation
    const qResults = {};
    let correct = 0;
    mol.questions.forEach((q) => {
      const ans = answers[q.id];
      if (q.type === "numeric") {
        const diff = Math.abs(Number(ans) - q.correctAnswer);
        qResults[q.id] = diff <= 2;
      } else {
        qResults[q.id] = ans === q.correctAnswer;
      }
      if (qResults[q.id]) correct++;
    });
    setResults(qResults);
    setSubmitted(true);

    const score = correct / mol.questions.length;
    setFeedback({
      type: score >= 0.8 ? "success" : score >= 0.5 ? "info" : "error",
      message: score >= 0.8 ? `Excellent! ${correct}/${mol.questions.length} correct!` : `${correct}/${mol.questions.length} correct. Review the 3D structure and try again.`,
    });

    if (submitAnswer) {
      try {
        await submitAnswer({ molecule: moleculeKey, answers, score });
      } catch (_) { /* ignore */ }
    }
  };

  const resetQuiz = () => { setAnswers({}); setResults({}); setFeedback(null); setSubmitted(false); };

  /* ---------- Molecule change ---------- */
  const changeMolecule = (key) => {
    setMoleculeKey(key);
    resetQuiz();
    trackInteraction?.("molecule_change", { molecule: key });
  };

  /* ---------- Render ---------- */
  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-gray-500">Loading simulation…</span></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <SimulationContainer title={simulation?.title || "Molecular Structure 3D Visualiser"}>
      <FeedbackOverlay feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- 3D viewer ---- */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* molecule selector */}
          <div className="flex gap-2 mb-3 flex-wrap justify-center">
            {Object.keys(MOLECULE_DATA).map((key) => (
              <button key={key} onClick={() => changeMolecule(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition ${moleculeKey === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"}`}>
                {MOLECULE_DATA[key].formula}
              </button>
            ))}
          </div>

          {/* canvas */}
          <canvas ref={canvasRef} width={520} height={400}
            className="border rounded-lg bg-gray-900 cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} />

          <p className="text-xs text-gray-400 mt-1">Click & drag to rotate</p>

          {/* controls */}
          <div className="flex gap-4 mt-3 flex-wrap justify-center items-center">
            {["ball-and-stick", "space-filling", "wireframe"].map((s) => (
              <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" name="molStyle" value={s} checked={style === s}
                  onChange={() => { setStyle(s); trackInteraction?.("style_change", { style: s }); }} />
                {s.replace(/-/g, " ")}
              </label>
            ))}

            <label className="flex items-center gap-1 text-sm cursor-pointer ml-4">
              <input type="checkbox" checked={showLabels} onChange={() => setShowLabels((v) => !v)} />
              Labels
            </label>
          </div>

          {/* info card */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs text-center w-full max-w-lg">
            {[["Formula", mol.formula], ["Geometry", mol.geometry], ["Bond Angle", mol.bondAngle], ["Polarity", mol.polarity], ["Hybridization", mol.hybridization]].map(([label, val]) => (
              <div key={label} className="bg-gray-100 rounded p-2">
                <div className="font-semibold text-gray-500">{label}</div>
                <div className="text-gray-800">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Questions panel ---- */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Questions — {mol.formula}</h3>

          {mol.questions.map((q) => (
            <div key={q.id} className={`p-3 rounded-lg border ${submitted ? (results[q.id] ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50") : "border-gray-200 bg-white"}`}>
              <p className="text-sm font-medium mb-2">{q.text}</p>

              {q.type === "numeric" ? (
                <input type="number" value={answers[q.id] ?? ""} disabled={submitted}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm" placeholder={`Answer in ${q.unit || "units"}`} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button key={opt} disabled={submitted}
                      onClick={() => handleAnswer(q.id, opt)}
                      className={`px-3 py-1 rounded text-sm border transition ${answers[q.id] === opt ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {submitted && !results[q.id] && (
                <p className="text-xs text-red-600 mt-1">Correct: {q.correctAnswer}{q.unit ? ` ${q.unit}` : ""}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={submitted || Object.keys(answers).length < mol.questions.length}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 transition">
              Submit
            </button>
            <button onClick={resetQuiz}
              className="flex-1 border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
              Reset
            </button>
          </div>
        </div>
      </div>
    </SimulationContainer>
  );
}
