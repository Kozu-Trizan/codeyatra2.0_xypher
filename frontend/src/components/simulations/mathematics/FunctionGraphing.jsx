import React, { useEffect, useRef, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/*
 * Function Graphing & Transformation – v2
 * Pure Canvas renderer with animated curve drawing, gradient fills,
 * neon glow curves, interactive vertex drag, gamified challenges,
 * and smooth parameter transitions.
 */

const FUNC_TYPES = [
  { id: "quadratic", label: "Quadratic", fn: (x, p) => p.a * x * x + p.b * x + p.c, expr: (p) => `y = ${f(p.a)}x\u00b2 + ${f(p.b)}x + ${f(p.c)}` },
  { id: "sine",      label: "Sine",      fn: (x, p) => p.a * Math.sin(p.b * x + p.c), expr: (p) => `y = ${f(p.a)}\u00b7sin(${f(p.b)}x + ${f(p.c)})` },
  { id: "cubic",     label: "Cubic",     fn: (x, p) => p.a * x * x * x + p.b * x + p.c, expr: (p) => `y = ${f(p.a)}x\u00b3 + ${f(p.b)}x + ${f(p.c)}` },
];
function f(n) { return n >= 0 ? n.toFixed(1) : n.toFixed(1); }

const TASKS = [
  { id: "open_downward", instruction: "Make the graph open downward / negative amplitude (a < 0)", check: (p) => p.a < 0 },
  { id: "shift_up",      instruction: "Shift the graph up by 5 units (c = 5)",                     check: (p) => Math.abs(p.c - 5) < 0.6 },
  { id: "wider",          instruction: "Make the graph wider (0 < |a| < 1)",                        check: (p) => Math.abs(p.a) > 0.05 && Math.abs(p.a) < 1 },
  { id: "sine_wave",      instruction: "Create a sine wave with frequency 2",                       check: (p, ft) => ft === "sine" && Math.abs(p.b - 2) < 0.6 },
];

export default function FunctionGraphing({ conceptId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  const [funcType, setFuncType] = useState("quadratic");
  const [params, setParams] = useState({ a: 1, b: 0, c: 0 });
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const currentFunc = FUNC_TYPES.find((ft) => ft.id === funcType) || FUNC_TYPES[0];

  // Check tasks on param change
  useEffect(() => {
    const newDone = TASKS.map((t, i) => tasksDone[i] || t.check(params, funcType));
    const bonus = newDone.filter((d, i) => d && !tasksDone[i]).length;
    if (bonus > 0) setScore((s) => s + bonus * 15);
    setTasksDone(newDone);
  }, [params, funcType]);

  // Animate curve drawing after param changes
  useEffect(() => {
    setAnimProgress(0);
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const prog = Math.min(1, (ts - start) / 600);
      setAnimProgress(prog);
      if (prog < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [params.a, params.b, params.c, funcType]);

  // ── Continuous draw loop ────────────────────────────────────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    const cx = W / 2, cy = H / 2, scale = 30;
    timeRef.current += 0.02;
    const t = timeRef.current;

    // ─ Background ─
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(0.6, "#0a0f1e");
    bg.addColorStop(1, "#030712");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Dot grid (instead of lines)
    ctx.fillStyle = "rgba(100,116,139,0.12)";
    for (let gx = 0; gx < W; gx += scale) {
      for (let gy = 0; gy < H; gy += scale) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Major grid rings (radial)
    ctx.strokeStyle = "rgba(99,102,241,0.04)";
    ctx.lineWidth = 1;
    for (let r = scale * 2; r < W; r += scale * 4) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }

    // ─ Axes (neon blue) ─
    ctx.save();
    ctx.shadowBlur = 6; ctx.shadowColor = "rgba(99,102,241,0.4)";
    ctx.strokeStyle = "rgba(99,102,241,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.restore();

    // Tick marks with numbers
    ctx.fillStyle = "#475569"; ctx.font = "10px 'Inter',sans-serif"; ctx.textAlign = "center";
    for (let i = -Math.ceil(W / 2 / scale); i <= Math.ceil(W / 2 / scale); i++) {
      if (i === 0) continue;
      const px = cx + i * scale;
      if (i % 2 === 0) {
        ctx.fillText(String(i), px, cy + 14);
        ctx.strokeStyle = "rgba(100,116,139,0.2)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(px, cy - 3); ctx.lineTo(px, cy + 3); ctx.stroke();
      }
    }
    ctx.textAlign = "right";
    for (let i = -Math.ceil(H / 2 / scale); i <= Math.ceil(H / 2 / scale); i++) {
      if (i === 0) continue;
      const py = cy + i * scale;
      if (i % 2 === 0) {
        ctx.fillText(String(-i), cx - 6, py + 4);
      }
    }
    ctx.textAlign = "left";

    // ─ Gradient fill under curve ─
    const fn = currentFunc.fn;
    const totalPx = W * animProgress;
    if (animProgress > 0.1) {
      ctx.save();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
      fillGrad.addColorStop(0, "rgba(99,102,241,0.08)");
      fillGrad.addColorStop(0.5, "rgba(59,130,246,0.04)");
      fillGrad.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.moveTo(cx - totalPx / 2, cy);
      for (let px = cx - totalPx / 2; px <= cx + totalPx / 2; px++) {
        const x = (px - cx) / scale;
        const y = fn(x, params);
        const py = cy - y * scale;
        if (py > -100 && py < H + 100) ctx.lineTo(px, py);
      }
      ctx.lineTo(cx + totalPx / 2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ─ Main curve (neon glow) ─
    const COLORS = { quadratic: "#818cf8", sine: "#34d399", cubic: "#f472b6" };
    const curveColor = COLORS[funcType] || "#818cf8";
    ctx.save();
    ctx.shadowBlur = 16; ctx.shadowColor = curveColor;
    ctx.strokeStyle = curveColor; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let px = cx - totalPx / 2; px <= cx + totalPx / 2; px++) {
      const x = (px - cx) / scale;
      const y = fn(x, params);
      const py = cy - y * scale;
      if (py < -200 || py > H + 200) { first = true; continue; }
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
    ctx.restore();

    // Second glow layer (brighter core)
    ctx.save();
    ctx.strokeStyle = curveColor + "aa"; ctx.lineWidth = 1.5;
    ctx.beginPath(); first = true;
    for (let px = cx - totalPx / 2; px <= cx + totalPx / 2; px++) {
      const x = (px - cx) / scale;
      const y = fn(x, params);
      const py = cy - y * scale;
      if (py < -200 || py > H + 200) { first = true; continue; }
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
    ctx.restore();

    // ─ Vertex / special point ─
    let spx, spy, spLabel;
    if (funcType === "quadratic") {
      const vx = -params.b / (2 * (params.a || 0.001));
      const vy = fn(vx, params);
      spx = cx + vx * scale; spy = cy - vy * scale;
      spLabel = `Vertex (${vx.toFixed(1)}, ${vy.toFixed(1)})`;
    } else if (funcType === "sine") {
      spx = cx - (params.c / (params.b || 1)) * scale;
      spy = cy; spLabel = "Phase shift";
    } else {
      spx = cx; spy = cy - params.c * scale;
      spLabel = `y-int (0, ${params.c.toFixed(1)})`;
    }

    // Crosshairs
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(239,68,68,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(spx, 0); ctx.lineTo(spx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, spy); ctx.lineTo(W, spy); ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing dot
    const dotR = 6 + Math.sin(t * 3) * 2;
    ctx.save();
    ctx.shadowBlur = 12; ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(spx, spy, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Label pill
    ctx.fillStyle = "rgba(239,68,68,0.15)";
    ctx.beginPath(); ctx.roundRect(spx + 12, spy - 14, ctx.measureText(spLabel).width + 20, 22, 6); ctx.fill();
    ctx.fillStyle = "#fca5a5"; ctx.font = "bold 11px 'Inter',sans-serif";
    ctx.fillText(spLabel, spx + 22, spy + 1);

    // ─ Equation HUD (top-left) ─
    const expr = currentFunc.expr(params);
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    const ew = ctx.measureText(expr).width + 28;
    ctx.beginPath(); ctx.roundRect(12, 12, ew, 30, 8); ctx.fill();
    ctx.strokeStyle = curveColor + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, 12, ew, 30, 8); ctx.stroke();
    ctx.fillStyle = curveColor; ctx.font = "bold 13px 'Inter',sans-serif";
    ctx.fillText(expr, 26, 32);

    // Score HUD
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.beginPath(); ctx.roundRect(W - 110, 12, 96, 30, 8); ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W - 110, 12, 96, 30, 8); ctx.stroke();
    ctx.fillStyle = "#a5b4fc"; ctx.font = "bold 13px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`\u2B50 ${score} pts`, W - 62, 32);
    ctx.textAlign = "left";

    animRef.current = requestAnimationFrame(draw);
  }, [params, funcType, score, animProgress, currentFunc]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── Handlers ────────────────────────────────────────────────────
  const changeParam = (key, val) => {
    setParams((prev) => ({ ...prev, [key]: val }));
    trackInteraction("parameter_changed", { parameter: key, value: val });
  };

  const checkAll = async () => {
    const allDone = TASKS.every((t) => t.check(params, funcType));
    if (allDone) {
      setFeedback({ type: "success", message: "All challenges completed! You mastered function transformations!" });
      await submitAnswer({ parameters: params, funcType, tasks: TASKS.map((t) => ({ id: t.id })) });
    } else {
      const remaining = TASKS.filter((t) => !t.check(params, funcType));
      setFeedback({ type: "error", message: `${remaining.length} challenge(s) remaining: ${remaining.map((t) => t.instruction).join("; ")}` });
    }
  };

  const reset = () => {
    setParams({ a: 1, b: 0, c: 0 });
    setFeedback(null);
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const paramConfig = funcType === "sine"
    ? [
        { key: "a", label: "Amplitude (a)", min: -3, max: 3, step: 0.1, color: "text-violet-400" },
        { key: "b", label: "Frequency (b)", min: 0.1, max: 5, step: 0.1, color: "text-emerald-400" },
        { key: "c", label: "Phase (c)", min: -6, max: 6, step: 0.5, color: "text-amber-400" },
      ]
    : [
        { key: "a", label: "Stretch (a)", min: -3, max: 3, step: 0.1, color: "text-violet-400" },
        { key: "b", label: "Linear (b)", min: -5, max: 5, step: 0.5, color: "text-emerald-400" },
        { key: "c", label: "Shift (c)", min: -10, max: 10, step: 0.5, color: "text-amber-400" },
      ];

  return (
    <SimulationContainer title="Function Graphing & Transformation">
      {/* Function type selector */}
      <div className="flex gap-2 flex-wrap">
        {FUNC_TYPES.map((ft) => (
          <button key={ft.id} onClick={() => { setFuncType(ft.id); reset(); trackInteraction("func_type_changed", { type: ft.id }); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${funcType === ft.id
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30"
              : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-indigo-500 hover:text-white"}`}>
            {ft.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={720} height={460}
        className="w-full rounded-xl border border-indigo-500/20" />

      {/* Equation live display */}
      <p className="text-center font-mono text-lg">
        <span className="text-violet-400">{params.a.toFixed(1)}</span>
        <span className="text-slate-500">{funcType === "sine" ? " \u00b7 sin(" : "x\u00b2 + "}</span>
        <span className="text-emerald-400">{params.b.toFixed(1)}</span>
        <span className="text-slate-500">{funcType === "sine" ? "x + " : "x + "}</span>
        <span className="text-amber-400">{params.c.toFixed(1)}</span>
        <span className="text-slate-500">{funcType === "sine" ? ")" : ""}</span>
      </p>

      {/* Sliders */}
      <div className="grid sm:grid-cols-3 gap-4">
        {paramConfig.map((s) => (
          <label key={s.key} className="flex flex-col gap-1.5 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>{s.label}</span>
              <span className={`font-bold ${s.color}`}>{params[s.key].toFixed(1)}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={params[s.key]}
              onChange={(e) => changeParam(s.key, +e.target.value)}
              className="accent-indigo-500 h-2" />
          </label>
        ))}
      </div>

      {/* Challenges */}
      <div className="border border-slate-800 rounded-xl p-4 bg-gradient-to-r from-slate-900/80 to-violet-950/20">
        <h4 className="text-sm font-bold text-violet-300 mb-2 flex items-center gap-2">{"\ud83c\udfaf"} Challenges</h4>
        <ul className="flex flex-col gap-1.5">
          {TASKS.map((tk, i) => (
            <li key={tk.id} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${tasksDone[i] ? "bg-emerald-500 text-white" : "border border-slate-700 text-slate-600"}`}>
                {tasksDone[i] ? "\u2713" : ""}
              </span>
              <span className={tasksDone[i] ? "text-emerald-300 line-through" : "text-slate-300"}>{tk.instruction}</span>
              {tasksDone[i] && <span className="text-amber-400 text-xs font-bold ml-auto">+15</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/20">
          Check All Challenges
        </button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Tips */}
      <div className="text-xs text-slate-500 flex flex-col gap-1 border-t border-slate-800 pt-3">
        <p><strong className="text-slate-400">a:</strong> Controls amplitude / stretch. Negative flips the graph.</p>
        <p><strong className="text-slate-400">b:</strong> {funcType === "sine" ? "Controls frequency (how many cycles)." : "Shifts the vertex horizontally."}</p>
        <p><strong className="text-slate-400">c:</strong> {funcType === "sine" ? "Phase shift (horizontal offset)." : "Shifts the entire graph up/down."}</p>
      </div>
    </SimulationContainer>
  );
}
