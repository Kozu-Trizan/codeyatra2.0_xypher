import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/*
 * Vector Decomposition Simulator – v2
 * Animated particles, neon glow aesthetic, hex-grid backdrop,
 * pulsing drag handles, parallax stars, gamified task system.
 */

const TASKS = [
  { id: "decompose_30", label: "Decompose a 30\u00b0 vector", check: (v, a, sx, sy) => Math.abs(a - 30) < 6 && acc(v, a, sx, sy) },
  { id: "decompose_60", label: "Decompose a 60\u00b0 vector", check: (v, a, sx, sy) => Math.abs(a - 60) < 6 && acc(v, a, sx, sy) },
  { id: "high_speed",   label: "Decompose V \u2265 40 m/s",  check: (v, a, sx, sy) => v >= 40 && acc(v, a, sx, sy) },
];
function acc(v, a, sx, sy) {
  const cx = v * Math.cos((a * Math.PI) / 180);
  const cy = v * Math.sin((a * Math.PI) / 180);
  return cx > 0.5 && cy > 0.5 && Math.abs(sx - cx) / cx < 0.07 && Math.abs(sy - cy) / cy < 0.07;
}

export default function VectorDecomposition({ conceptId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);

  const [velocity, setVelocity] = useState(25);
  const [angle, setAngle] = useState(35);
  const [studentVx, setStudentVx] = useState(10);
  const [studentVy, setStudentVy] = useState(10);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [score, setScore] = useState(0);
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const SCALE = 7;
  const origin = useRef({ x: 140, y: 360 });

  const correctVx = velocity * Math.cos((angle * Math.PI) / 180);
  const correctVy = velocity * Math.sin((angle * Math.PI) / 180);

  // Spawn glow particles along the main vector
  const spawnParticles = useCallback(() => {
    const rad = (angle * Math.PI) / 180;
    const O = origin.current;
    const ex = O.x + velocity * SCALE * Math.cos(rad);
    const ey = O.y - velocity * SCALE * Math.sin(rad);
    const ps = particlesRef.current;
    if (ps.length < 30) {
      const t = Math.random();
      ps.push({
        x: O.x + (ex - O.x) * t,
        y: O.y + (ey - O.y) * t,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: 1,
        size: 1.5 + Math.random() * 2,
      });
    }
  }, [velocity, angle]);

  // ── Continuous animation loop ─────────────────────────────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;
    const O = origin.current;
    timeRef.current += 0.02;
    const t = timeRef.current;

    // ─ Deep space radial background ─
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
    bg.addColorStop(0, "#0d1117");
    bg.addColorStop(0.5, "#060a12");
    bg.addColorStop(1, "#020408");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Twinkling stars
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5 + t * (3 + (i % 5))) % W;
      const sy = (i * 97.3 + t * (1 + (i % 3))) % H;
      const sz = 0.5 + Math.sin(t * 2 + i) * 0.3;
      ctx.globalAlpha = 0.25 + Math.sin(t * 3 + i * 0.7) * 0.2;
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Hex grid overlay
    ctx.strokeStyle = "rgba(56,189,248,0.04)";
    ctx.lineWidth = 0.5;
    const hexR = 40;
    for (let row = -1; row < H / (hexR * 1.5) + 1; row++) {
      for (let col = -1; col < W / (hexR * 1.73) + 1; col++) {
        const cx = col * hexR * 1.73 + (row % 2) * hexR * 0.866;
        const cy = row * hexR * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a2 = (Math.PI / 3) * k - Math.PI / 6;
          const px = cx + hexR * 0.8 * Math.cos(a2);
          const py = cy + hexR * 0.8 * Math.sin(a2);
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }

    // ─ Axes ─
    ctx.strokeStyle = `rgba(148,163,184,${0.35 + Math.sin(t) * 0.08})`;
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(20, O.y); ctx.lineTo(W - 20, O.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(O.x, H - 20); ctx.lineTo(O.x, 20); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "bold 14px 'Inter',sans-serif";
    ctx.fillText("x", W - 18, O.y - 8);
    ctx.fillText("y", O.x + 10, 22);

    // Origin pulse
    const pr = 8 + Math.sin(t * 3) * 3;
    ctx.beginPath(); ctx.arc(O.x, O.y, pr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(99,102,241,${0.3 + Math.sin(t * 3) * 0.2})`;
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(O.x, O.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#a5b4fc"; ctx.fill();

    // ─ Helper: glowing arrow ─
    const drawArrow = (sx, sy, ex, ey, color, lw, glow = 12) => {
      ctx.save();
      ctx.shadowBlur = glow; ctx.shadowColor = color;
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = lw; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      const a2 = Math.atan2(ey - sy, ex - sx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 14 * Math.cos(a2 - 0.4), ey - 14 * Math.sin(a2 - 0.4));
      ctx.lineTo(ex - 14 * Math.cos(a2 + 0.4), ey - 14 * Math.sin(a2 + 0.4));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    // ─ Main velocity vector (gradient) ─
    const rad = (angle * Math.PI) / 180;
    const vEndX = O.x + velocity * SCALE * Math.cos(rad);
    const vEndY = O.y - velocity * SCALE * Math.sin(rad);
    const vGrad = ctx.createLinearGradient(O.x, O.y, vEndX, vEndY);
    vGrad.addColorStop(0, "#34d399");
    vGrad.addColorStop(1, "#06b6d4");
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = "#10b981";
    ctx.strokeStyle = vGrad; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(vEndX, vEndY); ctx.stroke();
    const ma = Math.atan2(vEndY - O.y, vEndX - O.x);
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.moveTo(vEndX, vEndY);
    ctx.lineTo(vEndX - 16 * Math.cos(ma - 0.4), vEndY - 16 * Math.sin(ma - 0.4));
    ctx.lineTo(vEndX - 16 * Math.cos(ma + 0.4), vEndY - 16 * Math.sin(ma + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Vector label pill
    const lx = (O.x + vEndX) / 2, ly = (O.y + vEndY) / 2 - 16;
    ctx.fillStyle = "rgba(16,185,129,0.15)";
    ctx.beginPath(); ctx.roundRect(lx - 42, ly - 12, 84, 22, 8); ctx.fill();
    ctx.fillStyle = "#6ee7b7"; ctx.font = "bold 12px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`V = ${velocity} m/s`, lx, ly + 3);
    ctx.textAlign = "left";

    // Angle arc (animated wobble)
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.5;
    ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = "#fbbf24";
    ctx.beginPath(); ctx.arc(O.x, O.y, 55, -rad + Math.sin(t * 2) * 0.02, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fcd34d"; ctx.font = "bold 13px 'Inter',sans-serif";
    ctx.fillText(`${angle}\u00b0`, O.x + 60, O.y - 14);

    // ─ Dashed projections + right-angle box ─
    const vxEnd = O.x + studentVx * SCALE;
    const vyEnd = O.y - studentVy * SCALE;
    if (studentVx > 0.5 && studentVy > 0.5) {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(148,163,184,0.15)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(vxEnd, O.y); ctx.lineTo(vxEnd, vyEnd); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(O.x, vyEnd); ctx.lineTo(vxEnd, vyEnd); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vxEnd - 8, vyEnd); ctx.lineTo(vxEnd - 8, vyEnd + 8); ctx.lineTo(vxEnd, vyEnd + 8);
      ctx.stroke();
    }

    // ─ Student Vx (blue neon) ─
    drawArrow(O.x, O.y, vxEnd, O.y, "#60a5fa", 3, 14);
    ctx.fillStyle = "rgba(96,165,250,0.15)";
    ctx.beginPath(); ctx.roundRect(vxEnd - 50, O.y + 6, 80, 20, 6); ctx.fill();
    ctx.fillStyle = "#93c5fd"; ctx.font = "bold 11px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Vx = ${studentVx.toFixed(1)}`, vxEnd - 10, O.y + 20);
    ctx.textAlign = "left";

    // ─ Student Vy (pink neon) ─
    drawArrow(O.x, O.y, O.x, vyEnd, "#f472b6", 3, 14);
    ctx.fillStyle = "rgba(244,114,182,0.15)";
    ctx.beginPath(); ctx.roundRect(O.x + 8, vyEnd - 4, 80, 20, 6); ctx.fill();
    ctx.fillStyle = "#f9a8d4"; ctx.font = "bold 11px 'Inter',sans-serif";
    ctx.fillText(`Vy = ${studentVy.toFixed(1)}`, O.x + 14, vyEnd + 10);

    // ─ Ghost correct vectors ─
    if (showSolution) {
      ctx.globalAlpha = 0.35;
      drawArrow(O.x, O.y, O.x + correctVx * SCALE, O.y, "#60a5fa", 2, 6);
      drawArrow(O.x, O.y, O.x, O.y - correctVy * SCALE, "#f472b6", 2, 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px 'Inter',sans-serif";
      ctx.fillText(`\u2713 Vx=${correctVx.toFixed(1)}`, O.x + correctVx * SCALE - 50, O.y + 38);
      ctx.fillText(`\u2713 Vy=${correctVy.toFixed(1)}`, O.x + 8, O.y - correctVy * SCALE - 14);
    }

    // ─ Pulsing drag handles ─
    const drawHandle = (x, y, color) => {
      const r2 = 12 + Math.sin(t * 4) * 2;
      ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2);
      ctx.strokeStyle = color + "44"; ctx.lineWidth = 2; ctx.stroke();
      const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
      g.addColorStop(0, "#ffffff88");
      g.addColorStop(0.5, color + "cc");
      g.addColorStop(1, color + "33");
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    };
    drawHandle(vxEnd, O.y, "#60a5fa");
    drawHandle(O.x, vyEnd, "#f472b6");

    // ─ Particles ─
    spawnParticles();
    const ps = particlesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.015;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * 0.6;
      ctx.fillStyle = "#34d399";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ─ Score HUD ─
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.beginPath(); ctx.roundRect(W - 110, 12, 96, 30, 8); ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W - 110, 12, 96, 30, 8); ctx.stroke();
    ctx.fillStyle = "#a5b4fc"; ctx.font = "bold 13px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`\u2B50 Score: ${score}`, W - 62, 32);
    ctx.textAlign = "left";

    animRef.current = requestAnimationFrame(draw);
  }, [velocity, angle, studentVx, studentVy, showSolution, correctVx, correctVy, score, spawnParticles]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── Pointer events ──────────────────────────────────────────────
  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - rect.left) * (canvasRef.current.width / rect.width),
      y: (cy - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const handlePointerDown = (e) => {
    const pos = getPointerPos(e);
    const O = origin.current;
    const vxTip = { x: O.x + studentVx * SCALE, y: O.y };
    const vyTip = { x: O.x, y: O.y - studentVy * SCALE };
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    if (d(pos, vxTip) < 24) setDragging("vx");
    else if (d(pos, vyTip) < 24) setDragging("vy");
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    const O = origin.current;
    if (dragging === "vx") setStudentVx(Math.max(0, (pos.x - O.x) / SCALE));
    else setStudentVy(Math.max(0, (O.y - pos.y) / SCALE));
  };

  const handlePointerUp = () => {
    if (dragging) {
      trackInteraction("vector_adjusted", { studentVx, studentVy });
      setDragging(null);
    }
  };

  // ── Check ───────────────────────────────────────────────────────
  const checkAnswer = async () => {
    const tol = 0.07;
    const vxErr = correctVx > 0.5 ? Math.abs(studentVx - correctVx) / correctVx : 0;
    const vyErr = correctVy > 0.5 ? Math.abs(studentVy - correctVy) / correctVy : 0;

    if (vxErr < tol && vyErr < tol) {
      setFeedback({ type: "success", message: "Perfect decomposition! +10 points" });
      setScore((s) => s + 10);
      const newDone = TASKS.map((tk, i) => tasksDone[i] || tk.check(velocity, angle, studentVx, studentVy));
      const bonus = newDone.filter((d, i) => d && !tasksDone[i]).length;
      if (bonus > 0) setScore((s) => s + bonus * 25);
      setTasksDone(newDone);
      await submitAnswer({ velocity, angle, student_vx: studentVx, student_vy: studentVy, score });
    } else {
      let msg = "";
      if (vxErr >= tol) msg += studentVx > correctVx ? "Vx too large. " : "Vx too small. ";
      if (vyErr >= tol) msg += studentVy > correctVy ? "Vy too large. " : "Vy too small. ";
      const swapVx = velocity * Math.sin((angle * Math.PI) / 180);
      const swapVy = velocity * Math.cos((angle * Math.PI) / 180);
      if (Math.abs(studentVx - swapVx) < 1 && Math.abs(studentVy - swapVy) < 1)
        msg = "You swapped sin and cos! Vx = V\u00b7cos(\u03b8), Vy = V\u00b7sin(\u03b8).";
      setFeedback({ type: "error", message: msg.trim() });
    }
    trackInteraction("answer_checked", { studentVx, studentVy });
  };

  const randomize = () => {
    setVelocity(10 + Math.floor(Math.random() * 40));
    setAngle(10 + Math.floor(Math.random() * 75));
    setStudentVx(5 + Math.random() * 10);
    setStudentVy(5 + Math.random() * 10);
    setShowSolution(false); setFeedback(null);
    particlesRef.current = [];
    trackInteraction("randomized", {});
  };

  const reset = () => {
    setStudentVx(10); setStudentVy(10);
    setShowSolution(false); setFeedback(null);
    particlesRef.current = [];
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <SimulationContainer title="Vector Decomposition Simulator">
      <canvas
        ref={canvasRef} width={720} height={460}
        className="w-full rounded-xl border border-indigo-500/20 cursor-crosshair touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-slate-400">
          <div className="flex justify-between"><span>Velocity</span><span className="text-cyan-400 font-bold">{velocity} m/s</span></div>
          <input type="range" min={5} max={50} step={1} value={velocity}
            onChange={(e) => { setVelocity(+e.target.value); trackInteraction("velocity_changed", { value: +e.target.value }); }}
            className="accent-cyan-500 h-2" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate-400">
          <div className="flex justify-between"><span>Angle</span><span className="text-amber-400 font-bold">{angle}{"\u00b0"}</span></div>
          <input type="range" min={5} max={85} step={5} value={angle}
            onChange={(e) => { setAngle(+e.target.value); trackInteraction("angle_changed", { value: +e.target.value }); }}
            className="accent-amber-500 h-2" />
        </label>
      </div>

      {/* Tasks */}
      <div className="border border-slate-800 rounded-xl p-4 bg-gradient-to-r from-slate-900/80 to-indigo-950/30">
        <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">{"\ud83c\udfaf"} Challenges</h4>
        <ul className="flex flex-col gap-1.5">
          {TASKS.map((tk, i) => (
            <li key={tk.id} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${tasksDone[i] ? "bg-emerald-500 text-white" : "border border-slate-700 text-slate-600"}`}>
                {tasksDone[i] ? "\u2713" : ""}
              </span>
              <span className={tasksDone[i] ? "text-emerald-300 line-through" : "text-slate-300"}>{tk.label}</span>
              {tasksDone[i] && <span className="text-amber-400 text-xs font-bold ml-auto">+25</span>}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-slate-400 border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/50">
        <strong className="text-white">How to play:</strong> Drag the{" "}
        <span className="text-blue-400 font-semibold">blue (Vx)</span> and{" "}
        <span className="text-pink-400 font-semibold">pink (Vy)</span> handles to
        match the components of the{" "}
        <span className="text-emerald-400 font-semibold">main vector</span>.
      </p>

      <div className="flex flex-wrap gap-3">
        <button onClick={checkAnswer} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/20">Check Answer</button>
        <button onClick={randomize} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-sm font-bold text-white transition-all shadow-lg shadow-amber-500/20">{"\ud83c\udfb2"} Randomize</button>
        <button onClick={() => { setShowSolution((p) => !p); trackInteraction("solution_toggled", {}); }} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-indigo-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          {showSolution ? "Hide Solution" : "Show Solution"}
        </button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="text-xs text-slate-500 flex flex-wrap gap-4 border-t border-slate-800 pt-3">
        <span>Vx = V {"\u00b7"} cos({"\u03b8"}) = {correctVx.toFixed(2)} m/s</span>
        <span>Vy = V {"\u00b7"} sin({"\u03b8"}) = {correctVy.toFixed(2)} m/s</span>
      </div>
    </SimulationContainer>
  );
}
