import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

const FUNCTIONS = {
  "x²": (x) => x * x,
  "x³": (x) => x * x * x,
  "sin(x)": (x) => Math.sin(x),
  "cos(x)": (x) => Math.cos(x),
  "√x": (x) => (x >= 0 ? Math.sqrt(x) : 0),
};

const TASKS = [
  {
    id: "positive_area",
    instruction: "Find an integral with area > 2 (shade enough!)",
    check: (area) => area > 2,
  },
  {
    id: "negative_area",
    instruction: "Find an integral with negative area (curve below x-axis)",
    check: (area) => area < 0,
  },
  {
    id: "narrow",
    instruction: "Set bounds within 0.5 of each other (a ≈ b)",
    check: (_, a, b) => Math.abs(b - a) <= 0.5 && Math.abs(b - a) > 0.01,
  },
];

/* Numerical integration (Simpson's rule) */
function integrate(fn, a, b, n = 200) {
  if (a >= b) return 0;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}

export default function AreaUnderCurves({ conceptId }) {
  const canvasRef = useRef(null);
  const [fnKey, setFnKey] = useState("x²");
  const [bounds, setBounds] = useState({ a: 0, b: 2 });
  const [area, setArea] = useState(0);
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));
  const [feedback, setFeedback] = useState(null);
  const [dragging, setDragging] = useState(null); // "a" | "b" | null

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const fn = FUNCTIONS[fnKey];

  /* Compute area */
  useEffect(() => {
    const a = Math.min(bounds.a, bounds.b);
    const b = Math.max(bounds.a, bounds.b);
    const val = integrate(fn, a, b);
    setArea(val);
    setTasksDone(TASKS.map((t) => t.check(val, bounds.a, bounds.b)));
  }, [fn, bounds]);

  /* Draw */
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    const cx = W / 2, cy = H / 2;
    const scale = 50;

    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0c1222");
    bg.addColorStop(1, "#0a0f1e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    for (let i = -20; i <= 20; i++) {
      const px = cx + i * scale;
      const py = cy + i * scale;
      ctx.strokeStyle = i === 0 ? "rgba(100,116,139,0.6)" : "rgba(30,41,59,0.7)";
      ctx.lineWidth = i === 0 ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
      if (i !== 0 && Math.abs(i) <= 6) {
        ctx.fillStyle = "#475569";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(i, cx + i * scale, cy + 14);
        ctx.textAlign = "right";
        ctx.fillText(-i, cx - 7, cy + i * scale + 4);
      }
    }

    // Axis labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("x", W - 14, cy - 8);
    ctx.fillText("y", cx + 8, 14);

    const aVal = Math.min(bounds.a, bounds.b);
    const bVal = Math.max(bounds.a, bounds.b);

    // Shaded area under curve
    const areaColor = area >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
    ctx.fillStyle = areaColor;
    ctx.beginPath();
    const aPixel = cx + aVal * scale;
    const bPixel = cx + bVal * scale;
    ctx.moveTo(aPixel, cy);
    for (let px = aPixel; px <= bPixel; px++) {
      const x = (px - cx) / scale;
      const y = fn(x);
      ctx.lineTo(px, cy - y * scale);
    }
    ctx.lineTo(bPixel, cy);
    ctx.closePath();
    ctx.fill();

    // Shaded area border
    ctx.strokeStyle = area >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Function curve with glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#8b5cf6";
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= W; px++) {
      const x = (px - cx) / scale;
      const y = fn(x);
      const py = cy - y * scale;
      if (py < -200 || py > H + 200) { first = true; continue; }
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bound lines
    [
      { val: bounds.a, color: "#f59e0b", label: "a" },
      { val: bounds.b, color: "#3b82f6", label: "b" },
    ].forEach(({ val, color, label }) => {
      const px = cx + val * scale;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draggable handle
      ctx.fillStyle = color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(px, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, px, cy + 3);

      // Value label
      ctx.fillStyle = color;
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(`${label} = ${val.toFixed(1)}`, px, 20);
    });

    // Area label
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    const labelW = 180;
    ctx.beginPath();
    ctx.roundRect(W - labelW - 12, 10, labelW, 36, 8);
    ctx.fill();
    ctx.fillStyle = area >= 0 ? "#4ade80" : "#f87171";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Area ≈ ${area.toFixed(4)}`, W - 20, 34);
  }, [fn, bounds, area]);

  useEffect(() => { draw(); }, [draw]);

  /* Pointer drag for bounds */
  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const cx = canvasRef.current.width / 2;
    const scale = 50;
    const aPx = cx + bounds.a * scale;
    const bPx = cx + bounds.b * scale;
    if (Math.abs(mx - aPx) < 16) setDragging("a");
    else if (Math.abs(mx - bPx) < 16) setDragging("b");
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const cx = canvasRef.current.width / 2;
    const scale = 50;
    const val = Math.round(((mx - cx) / scale) * 10) / 10;
    setBounds((prev) => ({ ...prev, [dragging]: Math.max(-5, Math.min(5, val)) }));
  };

  const handlePointerUp = () => {
    if (dragging) {
      trackInteraction("bound_dragged", { bound: dragging, value: bounds[dragging] });
      setDragging(null);
    }
  };

  const changeFunction = (key) => {
    setFnKey(key);
    trackInteraction("function_changed", { function: key });
  };

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(area, bounds.a, bounds.b));
    if (done) {
      setFeedback({ type: "success", message: "All tasks completed! You understand definite integrals." });
      await submitAnswer({ function: fnKey, bounds, area, tasks: TASKS.map((t) => ({ id: t.id })) });
    } else {
      const remaining = TASKS.filter((t) => !t.check(area, bounds.a, bounds.b));
      setFeedback({ type: "error", message: `Complete ${remaining.length} more task(s): ${remaining.map((t) => t.instruction).join("; ")}` });
    }
  };

  const reset = () => {
    setBounds({ a: 0, b: 2 });
    setFnKey("x²");
    setFeedback(null);
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <SimulationContainer title="Area Under Curves Explorer">
      {/* Function picker */}
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.keys(FUNCTIONS).map((key) => (
          <button
            key={key}
            onClick={() => changeFunction(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              fnKey === key
                ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
                : "bg-slate-800 text-slate-300 border-slate-600 hover:border-violet-400"
            }`}
          >
            f(x) = {key}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={700}
        height={400}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      />

      <p className="text-center text-xs text-slate-400">Drag the orange (a) and blue (b) handles to change integration bounds</p>

      {/* Readout */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Lower (a)</div>
          <div className="text-lg font-bold text-amber-400">{bounds.a.toFixed(1)}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Upper (b)</div>
          <div className="text-lg font-bold text-blue-400">{bounds.b.toFixed(1)}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Area</div>
          <div className={`text-lg font-bold ${area >= 0 ? "text-emerald-400" : "text-red-400"}`}>{area.toFixed(4)}</div>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Lower bound (a): <span className="font-semibold text-amber-400">{bounds.a.toFixed(1)}</span>
          <input type="range" min={-5} max={5} step={0.1} value={bounds.a} onChange={(e) => setBounds((p) => ({ ...p, a: +e.target.value }))} className="accent-amber-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Upper bound (b): <span className="font-semibold text-blue-400">{bounds.b.toFixed(1)}</span>
          <input type="range" min={-5} max={5} step={0.1} value={bounds.b} onChange={(e) => setBounds((p) => ({ ...p, b: +e.target.value }))} className="accent-blue-500" />
        </label>
      </div>

      {/* Tasks */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
        <h4 className="text-sm font-semibold text-white mb-3">Tasks</h4>
        <ul className="flex flex-col gap-2">
          {TASKS.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs font-bold ${tasksDone[i] ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-700 text-slate-600"}`}>
                {tasksDone[i] ? "\u2713" : ""}
              </span>
              <span className={tasksDone[i] ? "text-emerald-300 line-through" : "text-slate-300"}>{t.instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors">Check Answers</button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="text-xs text-slate-500 flex flex-col gap-1">
        <p><strong className="text-slate-400">{"\\u222B"} (Integral):</strong> The area between the curve and the x-axis from a to b.</p>
        <p><strong className="text-slate-400">Signed area:</strong> Below x-axis counts as negative.</p>
        <p><strong className="text-slate-400">Drag bounds:</strong> Click and drag the coloured handles on the canvas.</p>
      </div>
    </SimulationContainer>
  );
}
