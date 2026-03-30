import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Projectile Motion Simulator
 * Launch a ball at adjustable angle & velocity, watch it arc through the air.
 * Tracks max height, range, and time of flight.
 */

const G = 9.81;

const TASKS = [
  { id: "max_range", instruction: "Achieve a range > 50 m", check: (s) => s.range > 50 },
  { id: "high_arc", instruction: "Reach a max height > 30 m", check: (s) => s.maxH > 30 },
  { id: "angle_45", instruction: "Launch at 45° and observe maximum range", check: (s) => Math.abs(s.angle - 45) < 2 && s.range > 40 },
];

export default function ProjectileMotion({ conceptId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(25);
  const [trail, setTrail] = useState([]);
  const [simState, setSimState] = useState("idle"); // idle | running | done
  const [stats, setStats] = useState({ range: 0, maxH: 0, time: 0, angle: 45 });
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));
  const [feedback, setFeedback] = useState(null);

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const launch = () => {
    setSimState("running");
    setTrail([]);
    trackInteraction("launch", { angle, speed });

    const rad = (angle * Math.PI) / 180;
    const vx = speed * Math.cos(rad);
    const vy = speed * Math.sin(rad);
    let t = 0;
    const dt = 0.02;
    const pts = [];
    let maxH = 0;

    const step = () => {
      t += dt;
      const x = vx * t;
      const y = vy * t - 0.5 * G * t * t;
      if (y > maxH) maxH = y;
      pts.push({ x, y, t });
      setTrail([...pts]);

      if (y <= 0 && t > 0.1) {
        const s = { range: x, maxH, time: t, angle };
        setStats(s);
        setSimState("done");
        setTasksDone(TASKS.map((tk) => tk.check(s)));
        return;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  /* Drawing */
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;

    // Background - night sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0e1a");
    bg.addColorStop(0.6, "#111827");
    bg.addColorStop(1, "#1a2332");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 173 + 47) % W;
      const sy = (i * 89 + 23) % (H * 0.5);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    const ground = H - 60;
    const originX = 60, originY = ground;
    const scaleX = (W - 120) / 80;
    const scaleY = (ground - 40) / 50;

    // Ground
    ctx.fillStyle = "#1e3a2f";
    ctx.fillRect(0, ground, W, H - ground);
    ctx.strokeStyle = "#22c55e55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(W, ground);
    ctx.stroke();

    // Grid lines (horizontal distance markers)
    ctx.strokeStyle = "rgba(71,85,105,0.3)";
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "#475569";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let d = 10; d <= 70; d += 10) {
      const px = originX + d * scaleX;
      ctx.beginPath();
      ctx.moveTo(px, ground);
      ctx.lineTo(px, ground + 8);
      ctx.stroke();
      ctx.fillText(`${d}m`, px, ground + 20);
    }
    // Vertical markers
    ctx.textAlign = "right";
    for (let h = 10; h <= 40; h += 10) {
      const py = originY - h * scaleY;
      ctx.beginPath();
      ctx.moveTo(originX - 8, py);
      ctx.lineTo(originX, py);
      ctx.stroke();
      ctx.fillText(`${h}m`, originX - 12, py + 4);
    }

    // Cannon/launcher
    const rad = (angle * Math.PI) / 180;
    const barLen = 35;
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(-rad);
    // Barrel
    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, -5, barLen, 10);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -5, barLen, 10);
    ctx.restore();
    // Base
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(originX, originY, 10, 0, Math.PI, true);
    ctx.fill();

    // Trail with gradient
    if (trail.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const alpha = 0.3 + 0.7 * (i / trail.length);
        ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(originX + trail[i - 1].x * scaleX, originY - trail[i - 1].y * scaleY);
        ctx.lineTo(originX + trail[i].x * scaleX, originY - trail[i].y * scaleY);
        ctx.stroke();
      }

      // Ball at latest position
      const last = trail[trail.length - 1];
      const bx = originX + last.x * scaleX;
      const by = originY - Math.max(0, last.y) * scaleY;

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#fbbf24";
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Velocity vector at ball (if running)
      if (simState === "running") {
        const vx = speed * Math.cos(rad);
        const vy = speed * Math.sin(rad) - G * last.t;
        const vmag = Math.sqrt(vx * vx + vy * vy);
        const arrowLen = 25;
        const endX = bx + (vx / vmag) * arrowLen;
        const endY = by - (vy / vmag) * arrowLen;
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        // Arrowhead
        const aAngle = Math.atan2(by - endY, endX - bx);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(aAngle - 0.4), endY + 8 * Math.sin(aAngle - 0.4));
        ctx.lineTo(endX - 8 * Math.cos(aAngle + 0.4), endY + 8 * Math.sin(aAngle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Stats overlay
    if (simState === "done") {
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.beginPath();
      ctx.roundRect(W - 200, 10, 190, 80, 10);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Range: ${stats.range.toFixed(1)} m`, W - 185, 32);
      ctx.fillText(`Max Height: ${stats.maxH.toFixed(1)} m`, W - 185, 50);
      ctx.fillText(`Time: ${stats.time.toFixed(2)} s`, W - 185, 68);
    }
  }, [trail, angle, speed, simState, stats]);

  useEffect(() => { draw(); }, [draw]);

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(stats));
    if (done) {
      setFeedback({ type: "success", message: "All tasks done! You've mastered projectile motion." });
      await submitAnswer({ angle, speed, stats });
    } else {
      const rem = TASKS.filter((t) => !t.check(stats));
      setFeedback({ type: "error", message: `${rem.length} task(s) remaining.` });
    }
  };

  const reset = () => {
    cancelAnimationFrame(animRef.current);
    setTrail([]);
    setSimState("idle");
    setStats({ range: 0, maxH: 0, time: 0, angle });
    setFeedback(null);
    trackInteraction("reset", {});
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SimulationContainer title="Projectile Motion Simulator">
      <canvas ref={canvasRef} width={720} height={420} className="w-full rounded-xl border border-slate-700 bg-slate-950" />

      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Launch Angle: <span className="font-semibold text-amber-400">{angle}°</span>
          <input type="range" min={5} max={85} step={1} value={angle} disabled={simState === "running"}
            onChange={(e) => { setAngle(+e.target.value); setStats((s) => ({ ...s, angle: +e.target.value })); }} className="accent-amber-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Initial Speed: <span className="font-semibold text-sky-400">{speed} m/s</span>
          <input type="range" min={5} max={40} step={1} value={speed} disabled={simState === "running"}
            onChange={(e) => setSpeed(+e.target.value)} className="accent-sky-500" />
        </label>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={launch} disabled={simState === "running"}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-slate-900 transition-colors disabled:opacity-40">
          {simState === "done" ? "Re-launch" : "Launch!"}
        </button>
        <button onClick={reset}
          className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          Reset
        </button>
        {simState === "done" && (
          <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">
            Check Tasks
          </button>
        )}
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

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="text-xs text-slate-500 flex flex-col gap-1">
        <p><strong className="text-slate-400">Range:</strong> R = v{"\u00B2"}sin(2{"\u03B8"}) / g</p>
        <p><strong className="text-slate-400">Max Height:</strong> H = v{"\u00B2"}sin{"\u00B2"}({"\u03B8"}) / (2g)</p>
        <p><strong className="text-slate-400">45{"\u00B0"} gives max range</strong> for a given speed (on flat ground).</p>
      </div>
    </SimulationContainer>
  );
}
