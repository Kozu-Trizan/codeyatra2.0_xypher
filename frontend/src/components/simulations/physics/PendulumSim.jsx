import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Simple Pendulum / SHM Simulator
 * Drag the bob to set the initial angle, release it, watch it swing.
 * Demonstrates period independence from mass, dependence on length.
 */

const G = 9.81;

const TASKS = [
  { id: "period", instruction: "Observe: period doesn't depend on mass (change mass, same period)", check: (s) => s.massChange && Math.abs(s.pDiff) < 0.05 },
  { id: "longer", instruction: "Make the pendulum longer to increase the period", check: (s) => s.length >= 2.5 },
  { id: "big_angle", instruction: "Set a large angle (> 60°) and see non-linearity", check: (s) => s.initAngle > 60 },
];

export default function PendulumSim({ conceptId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [length, setLength] = useState(1.5); // metres
  const [mass, setMass] = useState(1.0); // kg (cosmetic, doesn't change period)
  const [initAngle, setInitAngle] = useState(30); // degrees
  const [running, setRunning] = useState(false);
  const [theta, setTheta] = useState((30 * Math.PI) / 180);
  const [omega, setOmega] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [taskState, setTaskState] = useState({ massChange: false, pDiff: 999, length: 1.5, initAngle: 30 });
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));
  const prevPeriodRef = useRef(null);

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const start = () => {
    const rad = (initAngle * Math.PI) / 180;
    setTheta(rad);
    setOmega(0);
    setElapsed(0);
    setRunning(true);
    trackInteraction("start", { length, mass, initAngle });
  };

  const stop = () => {
    setRunning(false);
    cancelAnimationFrame(animRef.current);
  };

  /* Physics loop */
  useEffect(() => {
    if (!running) return;
    let lastTime = performance.now();
    let thetaLocal = (initAngle * Math.PI) / 180;
    let omegaLocal = 0;
    let t = 0;

    const step = (now) => {
      const dtReal = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const dt = dtReal * 1.5; // slight speedup for visual appeal

      // RK4-ish Euler for pendulum: d²θ/dt² = -(g/L)sin(θ)
      const alpha = -(G / length) * Math.sin(thetaLocal);
      omegaLocal += alpha * dt;
      omegaLocal *= 0.999; // tiny damping
      thetaLocal += omegaLocal * dt;
      t += dt;

      setTheta(thetaLocal);
      setOmega(omegaLocal);
      setElapsed(t);

      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, length, initAngle]);

  /* Track period for mass-change task */
  useEffect(() => {
    const T = 2 * Math.PI * Math.sqrt(length / G);
    if (prevPeriodRef.current !== null) {
      setTaskState((s) => ({ ...s, massChange: true, pDiff: Math.abs(T - prevPeriodRef.current), length, initAngle }));
    }
    prevPeriodRef.current = T;
  }, [mass]);

  useEffect(() => {
    setTaskState((s) => ({ ...s, length, initAngle }));
  }, [length, initAngle]);

  useEffect(() => {
    setTasksDone(TASKS.map((t) => t.check(taskState)));
  }, [taskState]);

  /* Drawing */
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1020");
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const pivotX = W / 2, pivotY = 60;
    const scale = 120; // m -> px
    const L = length * scale;
    const bobX = pivotX + L * Math.sin(theta);
    const bobY = pivotY + L * Math.cos(theta);
    const bobR = 8 + mass * 6; // bigger mass = bigger bob visually

    // Pivot mount
    ctx.fillStyle = "#475569";
    ctx.fillRect(pivotX - 40, 0, 80, 12);
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Ghost trail (faint arc showing path)
    ctx.strokeStyle = "rgba(99,102,241,0.15)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, L, Math.PI / 2 - 1.2, Math.PI / 2 + 1.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // String with gradient
    const sg = ctx.createLinearGradient(pivotX, pivotY, bobX, bobY);
    sg.addColorStop(0, "#94a3b8");
    sg.addColorStop(1, "#64748b");
    ctx.strokeStyle = sg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Bob with 3D sphere effect
    const sphereGrad = ctx.createRadialGradient(bobX - bobR * 0.3, bobY - bobR * 0.3, bobR * 0.1, bobX, bobY, bobR);
    sphereGrad.addColorStop(0, "#818cf8");
    sphereGrad.addColorStop(0.6, "#6366f1");
    sphereGrad.addColorStop(1, "#3730a3");
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#6366f1";
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Angle arc
    if (Math.abs(theta) > 0.02) {
      ctx.strokeStyle = "#fbbf24aa";
      ctx.lineWidth = 1.5;
      const arcR = 40;
      const startA = Math.PI / 2;
      const endA = Math.PI / 2 - theta;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, arcR, Math.min(startA, endA), Math.max(startA, endA));
      ctx.stroke();
      // Angle label
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "center";
      const labelAngle = (startA + endA) / 2;
      ctx.fillText(`${((theta * 180) / Math.PI).toFixed(1)}°`, pivotX + (arcR + 18) * Math.cos(labelAngle), pivotY + (arcR + 18) * Math.sin(labelAngle));
    }

    // Info
    const T = 2 * Math.PI * Math.sqrt(length / G);
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.beginPath();
    ctx.roundRect(10, H - 50, 250, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`T = ${T.toFixed(2)}s  |  t = ${elapsed.toFixed(1)}s  |  \u03C9 = ${omega.toFixed(2)} rad/s`, 20, H - 25);
  }, [theta, omega, length, mass, elapsed]);

  useEffect(() => { draw(); }, [draw]);

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(taskState));
    if (done) {
      setFeedback({ type: "success", message: "All tasks completed! You understand pendulum motion." });
      await submitAnswer({ length, mass, initAngle, taskState });
    } else {
      const rem = TASKS.filter((t) => !t.check(taskState));
      setFeedback({ type: "error", message: `${rem.length} task(s) remaining.` });
    }
  };

  const reset = () => {
    stop();
    setTheta((initAngle * Math.PI) / 180);
    setOmega(0);
    setElapsed(0);
    setFeedback(null);
    trackInteraction("reset", {});
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SimulationContainer title="Pendulum & Simple Harmonic Motion">
      <canvas ref={canvasRef} width={600} height={420} className="w-full rounded-xl border border-slate-700 bg-slate-950" />

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Length: <span className="font-semibold text-indigo-400">{length.toFixed(1)} m</span>
          <input type="range" min={0.5} max={3} step={0.1} value={length} disabled={running}
            onChange={(e) => setLength(+e.target.value)} className="accent-indigo-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Mass: <span className="font-semibold text-rose-400">{mass.toFixed(1)} kg</span>
          <input type="range" min={0.5} max={3} step={0.1} value={mass}
            onChange={(e) => setMass(+e.target.value)} className="accent-rose-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Initial Angle: <span className="font-semibold text-amber-400">{initAngle}°</span>
          <input type="range" min={5} max={85} step={1} value={initAngle} disabled={running}
            onChange={(e) => setInitAngle(+e.target.value)} className="accent-amber-500" />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {!running ? (
          <button onClick={start} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-colors">
            {elapsed > 0 ? "Restart" : "Release!"}
          </button>
        ) : (
          <button onClick={stop} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white transition-colors">
            Stop
          </button>
        )}
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          Reset
        </button>
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors">
          Check Tasks
        </button>
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
        <p><strong className="text-slate-400">Period:</strong> T = 2{"\u03C0"}{"\u221A"}(L/g) -- depends on length, NOT mass.</p>
        <p><strong className="text-slate-400">SHM approximation:</strong> Only valid for small angles ({"\u03B8"} {"<"} 15°).</p>
        <p><strong className="text-slate-400">Try:</strong> Change mass and see that the period stays the same!</p>
      </div>
    </SimulationContainer>
  );
}
