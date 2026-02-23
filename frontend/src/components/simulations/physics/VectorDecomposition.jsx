import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Physics Vector Decomposition Simulator.
 *
 * Draws a velocity vector on an HTML Canvas and lets the student
 * drag horizontal (Vx) and vertical (Vy) component arrows to the
 * correct magnitudes.  Uses plain Canvas 2D — no external libs
 * needed (p5 / matter-js are optional enhancements later).
 */
export default function VectorDecomposition({ conceptId }) {
  const canvasRef = useRef(null);
  const [velocity, setVelocity] = useState(25);
  const [angle, setAngle] = useState(35);
  const [studentVx, setStudentVx] = useState(10);
  const [studentVy, setStudentVy] = useState(10);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dragging, setDragging] = useState(null); // "vx" | "vy" | null

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const SCALE = 8; // px per m/s
  const origin = useRef({ x: 160, y: 340 });

  // Correct values
  const correctVx = velocity * Math.cos((angle * Math.PI) / 180);
  const correctVy = velocity * Math.sin((angle * Math.PI) / 180);

  // ── Draw ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;
    const O = origin.current;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(O.x, 0); ctx.lineTo(O.x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.stroke();

    const drawArrow = (sx, sy, ex, ey, color, lw = 3) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(ey - sy, ex - sx);
      const hs = 10;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hs * Math.cos(a - 0.4), ey - hs * Math.sin(a - 0.4));
      ctx.lineTo(ex - hs * Math.cos(a + 0.4), ey - hs * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
    };

    // Main velocity vector (green)
    const rad = (angle * Math.PI) / 180;
    const vEndX = O.x + velocity * SCALE * Math.cos(rad);
    const vEndY = O.y - velocity * SCALE * Math.sin(rad);
    drawArrow(O.x, O.y, vEndX, vEndY, "#22c55e", 3);

    // Label V
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 14px Inter, sans-serif";
    const lx = (O.x + vEndX) / 2 - 20;
    const ly = (O.y + vEndY) / 2 - 10;
    ctx.fillText(`V = ${velocity} m/s`, lx, ly);

    // Angle arc
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(O.x, O.y, 40, -rad, 0);
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`${angle}°`, O.x + 44, O.y - 8);

    // Student Vx (blue)
    const vxEnd = O.x + studentVx * SCALE;
    drawArrow(O.x, O.y, vxEnd, O.y, "#3b82f6", 3);
    ctx.fillStyle = "#3b82f6";
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(`Vx = ${studentVx.toFixed(1)}`, vxEnd - 30, O.y + 20);

    // Student Vy (red)
    const vyEnd = O.y - studentVy * SCALE;
    drawArrow(O.x, O.y, O.x, vyEnd, "#ef4444", 3);
    ctx.fillStyle = "#ef4444";
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(`Vy = ${studentVy.toFixed(1)}`, O.x + 8, vyEnd + 4);

    // Ghost correct vectors when showing solution
    if (showSolution) {
      const cxEnd = O.x + correctVx * SCALE;
      const cyEnd = O.y - correctVy * SCALE;
      drawArrow(O.x, O.y, cxEnd, O.y, "rgba(59,130,246,0.3)", 2);
      drawArrow(O.x, O.y, O.x, cyEnd, "rgba(239,68,68,0.3)", 2);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(`Correct Vx = ${correctVx.toFixed(1)}`, cxEnd - 50, O.y + 36);
      ctx.fillText(`Correct Vy = ${correctVy.toFixed(1)}`, O.x + 8, cyEnd - 10);
    }

    // Drag handles — circles at arrow tips
    const drawHandle = (x, y, color) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    drawHandle(vxEnd, O.y, "#3b82f6");
    drawHandle(O.x, vyEnd, "#ef4444");
  }, [velocity, angle, studentVx, studentVy, showSolution, correctVx, correctVy]);

  useEffect(() => { draw(); }, [draw]);

  // ── Pointer events ──────────────────────────────────────────────
  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getPointerPos(e);
    const O = origin.current;
    const vxTip = { x: O.x + studentVx * SCALE, y: O.y };
    const vyTip = { x: O.x, y: O.y - studentVy * SCALE };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    if (dist({ x, y }, vxTip) < 20) setDragging("vx");
    else if (dist({ x, y }, vyTip) < 20) setDragging("vy");
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const O = origin.current;
    if (dragging === "vx") {
      setStudentVx(Math.max(0, (x - O.x) / SCALE));
    } else {
      setStudentVy(Math.max(0, (O.y - y) / SCALE));
    }
  };

  const handlePointerUp = () => {
    if (dragging) {
      trackInteraction("vector_adjusted", { studentVx, studentVy });
      setDragging(null);
    }
  };

  // ── Check answer ────────────────────────────────────────────────
  const checkAnswer = async () => {
    const tol = 0.05;
    const vxErr = correctVx ? Math.abs(studentVx - correctVx) / correctVx : 0;
    const vyErr = correctVy ? Math.abs(studentVy - correctVy) / correctVy : 0;

    if (vxErr < tol && vyErr < tol) {
      setFeedback({ type: "success", message: "Perfect! You correctly decomposed the vector!" });
      await submitAnswer({ velocity, angle, student_vx: studentVx, student_vy: studentVy });
    } else {
      let msg = "";
      if (vxErr >= tol) msg += studentVx > correctVx ? "Horizontal component is too large. " : "Horizontal component is too small. ";
      if (vyErr >= tol) msg += studentVy > correctVy ? "Vertical component is too large. " : "Vertical component is too small. ";
      // sin/cos swap check
      const swapVx = velocity * Math.sin((angle * Math.PI) / 180);
      const swapVy = velocity * Math.cos((angle * Math.PI) / 180);
      if (Math.abs(studentVx - swapVx) < 1 && Math.abs(studentVy - swapVy) < 1) {
        msg = "You swapped sin and cos! Horizontal uses cos(θ), vertical uses sin(θ).";
      }
      setFeedback({ type: "error", message: msg.trim() });
    }
    trackInteraction("answer_checked", { studentVx, studentVy });
  };

  const reset = () => {
    setStudentVx(10);
    setStudentVy(10);
    setShowSolution(false);
    setFeedback(null);
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SimulationContainer title="Vector Decomposition Simulator">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={700}
        height={440}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 cursor-crosshair touch-none"
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
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Velocity: <span className="text-white font-semibold">{velocity} m/s</span>
          <input type="range" min={5} max={50} step={1} value={velocity} onChange={(e) => { setVelocity(+e.target.value); trackInteraction("velocity_changed", { value: +e.target.value }); }} className="accent-indigo-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Angle: <span className="text-white font-semibold">{angle}°</span>
          <input type="range" min={5} max={85} step={5} value={angle} onChange={(e) => { setAngle(+e.target.value); trackInteraction("angle_changed", { value: +e.target.value }); }} className="accent-indigo-500" />
        </label>
      </div>

      <p className="text-sm text-slate-400 border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/50">
        <strong className="text-white">Task:</strong> Drag the{" "}
        <span className="text-blue-400 font-semibold">blue (Vx)</span> and{" "}
        <span className="text-red-400 font-semibold">red (Vy)</span> arrows to
        match the horizontal and vertical components of the{" "}
        <span className="text-emerald-400 font-semibold">green velocity vector</span>.
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={checkAnswer} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">Check My Answer</button>
        <button onClick={() => { setShowSolution((p) => !p); trackInteraction("solution_toggled", {}); }} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          {showSolution ? "Hide Solution" : "Show Solution"}
        </button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Formulas */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-4">
        <span>Vx = V · cos(θ) = {correctVx.toFixed(2)} m/s</span>
        <span>Vy = V · sin(θ) = {correctVy.toFixed(2)} m/s</span>
      </div>
    </SimulationContainer>
  );
}
