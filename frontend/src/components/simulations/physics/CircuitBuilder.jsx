import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Simple Circuit Builder
 * Build series/parallel circuits with resistors, toggle a switch,
 * observe current / voltage readings via Ohm's Law.
 */

const TASKS = [
  { id: "series", instruction: "Build a series circuit with total R > 10\u03A9", check: (s) => s.mode === "series" && s.totalR > 10 },
  { id: "parallel", instruction: "Build a parallel circuit and observe lower total R", check: (s) => s.mode === "parallel" && s.totalR < s.minIndividual },
  { id: "high_current", instruction: "Achieve a current > 2A", check: (s) => s.current > 2 },
];

export default function CircuitBuilder({ conceptId }) {
  const canvasRef = useRef(null);

  const [voltage, setVoltage] = useState(12);
  const [resistors, setResistors] = useState([10, 20]);
  const [mode, setMode] = useState("series"); // series | parallel
  const [switchOn, setSwitchOn] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const totalR = mode === "series"
    ? resistors.reduce((s, r) => s + r, 0)
    : 1 / resistors.reduce((s, r) => s + 1 / r, 0);
  const current = switchOn ? voltage / totalR : 0;
  const minIndividual = Math.min(...resistors);

  const state = { mode, totalR, current, minIndividual, voltage };

  useEffect(() => {
    setTasksDone(TASKS.map((t) => t.check(state)));
  }, [mode, totalR, current, voltage]);

  /* Drawing */
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;

    // Background
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(0, 0, W, H);

    // Circuit path
    const margin = 80;
    const top = 80, bottom = H - 80;
    const left = margin, right = W - margin;

    ctx.strokeStyle = switchOn ? "#fbbf24" : "#475569";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    // Battery (left side)
    const batY = (top + bottom) / 2;
    // Top wire
    ctx.beginPath();
    ctx.moveTo(left, batY - 30);
    ctx.lineTo(left, top);
    ctx.lineTo(right, top);
    ctx.stroke();

    // Bottom wire (with switch)
    ctx.beginPath();
    ctx.moveTo(left, batY + 30);
    ctx.lineTo(left, bottom);

    // Switch
    const swX = left + (right - left) * 0.15;
    ctx.lineTo(swX - 15, bottom);
    ctx.stroke();

    if (switchOn) {
      ctx.beginPath();
      ctx.moveTo(swX - 15, bottom);
      ctx.lineTo(swX + 15, bottom);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(swX - 15, bottom);
      ctx.lineTo(swX + 10, bottom - 20);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(swX + 15, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    // Battery symbol
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left - 12, batY - 18);
    ctx.lineTo(left + 12, batY - 18);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left - 6, batY - 8);
    ctx.lineTo(left + 6, batY - 8);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left - 12, batY + 2);
    ctx.lineTo(left + 12, batY + 2);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left - 6, batY + 12);
    ctx.lineTo(left + 6, batY + 12);
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${voltage}V`, left, batY + 35);
    ctx.fillStyle = "#ef444488";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("+", left, batY - 25);
    ctx.fillText("-", left, batY + 25);

    // Resistors on the right side
    ctx.strokeStyle = switchOn ? "#fbbf24" : "#475569";
    ctx.lineWidth = 3;

    if (mode === "series") {
      // Series: Resistors stacked vertically on the right wire
      const gap = (bottom - top) / (resistors.length + 1);
      resistors.forEach((r, i) => {
        const ry = top + gap * (i + 1);
        // Wire to resistor
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(right, top);
          ctx.lineTo(right, ry - 18);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(right, top + gap * i + 18);
          ctx.lineTo(right, ry - 18);
          ctx.stroke();
        }

        // Zigzag resistor symbol
        drawResistor(ctx, right, ry, r, switchOn);

        if (i === resistors.length - 1) {
          ctx.strokeStyle = switchOn ? "#fbbf24" : "#475569";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(right, ry + 18);
          ctx.lineTo(right, bottom);
          ctx.stroke();
        }
      });
    } else {
      // Parallel: Resistors side by side
      const spacing = Math.min(100, (right - left - 200) / resistors.length);
      const startX = (left + right) / 2 - ((resistors.length - 1) * spacing) / 2;

      // Top bus
      ctx.beginPath();
      ctx.moveTo(right, top);
      ctx.lineTo(startX - 30, top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX + (resistors.length - 1) * spacing + 30, top);
      ctx.lineTo(right, top);
      ctx.stroke();

      // Bottom bus
      ctx.beginPath();
      ctx.moveTo(right, bottom);
      ctx.lineTo(startX - 30, bottom);
      ctx.stroke();

      // Each branch
      resistors.forEach((r, i) => {
        const rx = startX + i * spacing;

        ctx.strokeStyle = switchOn ? "#fbbf24" : "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx, top);
        ctx.lineTo(rx, (top + bottom) / 2 - 18);
        ctx.stroke();

        drawResistor(ctx, rx, (top + bottom) / 2, r, switchOn);

        ctx.strokeStyle = switchOn ? "#fbbf24" : "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx, (top + bottom) / 2 + 18);
        ctx.lineTo(rx, bottom);
        ctx.stroke();
      });
    }

    // Current flow arrows (animated dots)
    if (switchOn && current > 0) {
      const t = Date.now() / 300;
      ctx.fillStyle = "#fbbf2488";
      for (let i = 0; i < 8; i++) {
        const frac = ((t * 0.1 + i * 0.125) % 1);
        // Simplified: place dots along the top wire
        const dx = left + frac * (right - left);
        ctx.beginPath();
        ctx.arc(dx, top - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Readings panel
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, H - 48, 220, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`R = ${totalR.toFixed(1)}\u03A9 | I = ${current.toFixed(2)}A | P = ${(voltage * current).toFixed(1)}W`, W / 2, H - 23);

    // Switch label
    ctx.fillStyle = switchOn ? "#4ade80" : "#ef4444";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(switchOn ? "ON" : "OFF", swX, bottom + 18);
  }, [resistors, mode, voltage, switchOn, totalR, current]);

  useEffect(() => { draw(); }, [draw]);

  // Animate current flow
  useEffect(() => {
    if (!switchOn) return;
    const id = setInterval(() => draw(), 50);
    return () => clearInterval(id);
  }, [switchOn, draw]);

  function drawResistor(ctx, x, y, value, on) {
    const zigW = 8, zigH = 3, segs = 6;
    ctx.strokeStyle = on ? "#a78bfa" : "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    for (let i = 0; i < segs; i++) {
      const sy = y - 18 + (36 / segs) * (i + 0.25);
      const signX = i % 2 === 0 ? zigW : -zigW;
      ctx.lineTo(x + signX, sy);
    }
    ctx.lineTo(x, y + 18);
    ctx.stroke();

    // Value label
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${value}\u03A9`, x + 14, y + 4);
  }

  const addResistor = () => {
    if (resistors.length < 5) {
      setResistors([...resistors, 10]);
      trackInteraction("add_resistor", { count: resistors.length + 1 });
    }
  };

  const removeResistor = () => {
    if (resistors.length > 1) {
      setResistors(resistors.slice(0, -1));
      trackInteraction("remove_resistor", { count: resistors.length - 1 });
    }
  };

  const updateR = (idx, val) => {
    const next = [...resistors];
    next[idx] = val;
    setResistors(next);
  };

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(state));
    if (done) {
      setFeedback({ type: "success", message: "All tasks done! You understand Ohm's Law and circuit types." });
      await submitAnswer(state);
    } else {
      const rem = TASKS.filter((t) => !t.check(state));
      setFeedback({ type: "error", message: `${rem.length} task(s) remaining.` });
    }
  };

  const reset = () => {
    setResistors([10, 20]);
    setVoltage(12);
    setMode("series");
    setSwitchOn(true);
    setFeedback(null);
    trackInteraction("reset", {});
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SimulationContainer title="Circuit Builder & Ohm's Law">
      <canvas ref={canvasRef} width={660} height={420} className="w-full rounded-xl border border-slate-700 bg-slate-950" />

      {/* Mode toggle */}
      <div className="flex items-center gap-4 justify-center">
        {["series", "parallel"].map((m) => (
          <button key={m} onClick={() => { setMode(m); trackInteraction("mode_change", { mode: m }); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
              mode === m ? "bg-yellow-500 text-slate-900 border-yellow-400" : "bg-slate-800 text-slate-300 border-slate-600 hover:border-yellow-400"
            }`}>
            {m}
          </button>
        ))}
        <button onClick={() => setSwitchOn((s) => !s)}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            switchOn ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-800 text-red-400 border-red-600"
          }`}>
          Switch: {switchOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Voltage */}
      <label className="flex flex-col gap-1 text-sm text-slate-400 max-w-md mx-auto w-full">
        Battery Voltage: <span className="font-semibold text-red-400">{voltage}V</span>
        <input type="range" min={1} max={24} step={1} value={voltage}
          onChange={(e) => setVoltage(+e.target.value)} className="accent-red-500" />
      </label>

      {/* Resistor controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 justify-center">
          <button onClick={addResistor} disabled={resistors.length >= 5}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white font-semibold disabled:opacity-30 transition">
            + Add R
          </button>
          <button onClick={removeResistor} disabled={resistors.length <= 1}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white font-semibold disabled:opacity-30 transition">
            - Remove
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {resistors.map((r, i) => (
            <label key={i} className="flex flex-col gap-1 text-xs text-slate-400">
              R{i + 1}: <span className="font-semibold text-violet-400">{r}{"\u03A9"}</span>
              <input type="range" min={1} max={50} step={1} value={r}
                onChange={(e) => updateR(i, +e.target.value)} className="accent-violet-500" />
            </label>
          ))}
        </div>
      </div>

      {/* Readings */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Total R</div>
          <div className="text-lg font-bold text-violet-400">{totalR.toFixed(1)}{"\u03A9"}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Current</div>
          <div className="text-lg font-bold text-amber-400">{current.toFixed(2)}A</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="text-xs text-slate-400">Power</div>
          <div className="text-lg font-bold text-red-400">{(voltage * current).toFixed(1)}W</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">Check Tasks</button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

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

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="text-xs text-slate-500 flex flex-col gap-1">
        <p><strong className="text-slate-400">Ohm's Law:</strong> V = IR, so I = V/R.</p>
        <p><strong className="text-slate-400">Series:</strong> R{"\u209C"} = R{"\u2081"} + R{"\u2082"} + ... (resistances add).</p>
        <p><strong className="text-slate-400">Parallel:</strong> 1/R{"\u209C"} = 1/R{"\u2081"} + 1/R{"\u2082"} + ... (total R decreases).</p>
      </div>
    </SimulationContainer>
  );
}
