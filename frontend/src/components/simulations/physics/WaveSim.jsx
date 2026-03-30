import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Standing & Transverse Wave Simulator
 * Visualise wave parameters: amplitude, frequency, wavelength.
 * Supports superposition of two waves to see interference.
 */

const TASKS = [
  { id: "high_freq", instruction: "Increase frequency to > 3 Hz", check: (s) => s.freq1 > 3 },
  { id: "big_amp", instruction: "Set amplitude > 1.5", check: (s) => s.amp1 > 1.5 },
  { id: "destructive", instruction: "Enable Wave 2 and create destructive interference", check: (s) => s.wave2 && Math.abs(s.freq1 - s.freq2) < 0.2 && Math.abs(s.amp1 - s.amp2) < 0.2 && Math.abs(s.phase2 - Math.PI) < 0.5 },
];

export default function WaveSim({ conceptId }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  const [amp1, setAmp1] = useState(1.0);
  const [freq1, setFreq1] = useState(1.5);
  const [amp2, setAmp2] = useState(1.0);
  const [freq2, setFreq2] = useState(1.5);
  const [phase2, setPhase2] = useState(Math.PI); // in radians
  const [wave2, setWave2] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const state = { amp1, freq1, amp2, freq2, phase2, wave2 };

  useEffect(() => {
    setTasksDone(TASKS.map((t) => t.check(state)));
  }, [amp1, freq1, amp2, freq2, phase2, wave2]);

  /* Animation loop */
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      timeRef.current += dt;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, amp1, freq1, amp2, freq2, phase2, wave2]);

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    const cy = H / 2;
    const t = timeRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#070d1a");
    bg.addColorStop(1, "#0c1628");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Equilibrium line
    ctx.strokeStyle = "rgba(71,85,105,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Amplitude guide lines
    const ampScale = 80;
    [-amp1, amp1].forEach((a) => {
      const py = cy - a * ampScale;
      if (py > 0 && py < H) {
        ctx.strokeStyle = "rgba(99,102,241,0.15)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
        ctx.stroke();
      }
    });

    const k = (2 * Math.PI) / 150; // wave number (pixels)

    // Wave 1
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#3b82f6";
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const y = amp1 * Math.sin(k * x - 2 * Math.PI * freq1 * t) * ampScale;
      x === 0 ? ctx.moveTo(x, cy - y) : ctx.lineTo(x, cy - y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wave 2 (optional)
    if (wave2) {
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ec4899";
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = amp2 * Math.sin(k * x - 2 * Math.PI * freq2 * t + phase2) * ampScale;
        x === 0 ? ctx.moveTo(x, cy - y) : ctx.lineTo(x, cy - y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Resultant (superposition)
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#22c55e";
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y1 = amp1 * Math.sin(k * x - 2 * Math.PI * freq1 * t);
        const y2 = amp2 * Math.sin(k * x - 2 * Math.PI * freq2 * t + phase2);
        const y = (y1 + y2) * ampScale;
        x === 0 ? ctx.moveTo(x, cy - y) : ctx.lineTo(x, cy - y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Legend
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.beginPath();
    ctx.roundRect(10, 10, wave2 ? 200 : 120, wave2 ? 70 : 30, 8);
    ctx.fill();
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("\u2500 Wave 1", 20, 30);
    if (wave2) {
      ctx.fillStyle = "#f472b6";
      ctx.fillText("\u2500 Wave 2", 20, 48);
      ctx.fillStyle = "#4ade80";
      ctx.fillText("\u2500 Resultant", 20, 66);
    }

    // Wavelength indicator
    const wavelength = 150; // pixels (one full cycle)
    const arrowY = H - 30;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, arrowY);
    ctx.lineTo(50 + wavelength, arrowY);
    ctx.stroke();
    // Arrows
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(50, arrowY);
    ctx.lineTo(58, arrowY - 4);
    ctx.lineTo(58, arrowY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(50 + wavelength, arrowY);
    ctx.lineTo(50 + wavelength - 8, arrowY - 4);
    ctx.lineTo(50 + wavelength - 8, arrowY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u03BB (wavelength)", 50 + wavelength / 2, arrowY - 8);
  }, [amp1, freq1, amp2, freq2, phase2, wave2]);

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(state));
    if (done) {
      setFeedback({ type: "success", message: "All tasks completed! You've mastered wave properties." });
      await submitAnswer(state);
    } else {
      const rem = TASKS.filter((t) => !t.check(state));
      setFeedback({ type: "error", message: `${rem.length} task(s) remaining.` });
    }
  };

  const reset = () => {
    setAmp1(1.0);
    setFreq1(1.5);
    setAmp2(1.0);
    setFreq2(1.5);
    setPhase2(Math.PI);
    setWave2(false);
    setFeedback(null);
    timeRef.current = 0;
    trackInteraction("reset", {});
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SimulationContainer title="Wave Motion & Superposition">
      <canvas ref={canvasRef} width={720} height={360} className="w-full rounded-xl border border-slate-700 bg-slate-950" />

      {/* Wave 1 controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amplitude 1: <span className="font-semibold text-blue-400">{amp1.toFixed(1)}</span>
          <input type="range" min={0.1} max={2} step={0.1} value={amp1}
            onChange={(e) => setAmp1(+e.target.value)} className="accent-blue-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Frequency 1: <span className="font-semibold text-blue-400">{freq1.toFixed(1)} Hz</span>
          <input type="range" min={0.5} max={5} step={0.1} value={freq1}
            onChange={(e) => setFreq1(+e.target.value)} className="accent-blue-500" />
        </label>
      </div>

      {/* Wave 2 toggle */}
      <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={wave2} onChange={() => setWave2((v) => !v)} className="accent-pink-500 w-4 h-4" />
        Enable Wave 2 (for superposition / interference)
      </label>

      {wave2 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Amplitude 2: <span className="font-semibold text-pink-400">{amp2.toFixed(1)}</span>
            <input type="range" min={0.1} max={2} step={0.1} value={amp2}
              onChange={(e) => setAmp2(+e.target.value)} className="accent-pink-500" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Frequency 2: <span className="font-semibold text-pink-400">{freq2.toFixed(1)} Hz</span>
            <input type="range" min={0.5} max={5} step={0.1} value={freq2}
              onChange={(e) => setFreq2(+e.target.value)} className="accent-pink-500" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Phase 2: <span className="font-semibold text-pink-400">{((phase2 * 180) / Math.PI).toFixed(0)}°</span>
            <input type="range" min={0} max={6.28} step={0.1} value={phase2}
              onChange={(e) => setPhase2(+e.target.value)} className="accent-pink-500" />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setPlaying((p) => !p)}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-sm font-bold text-white transition-colors">
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          Reset
        </button>
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">
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
        <p><strong className="text-slate-400">v = f{"\u03BB"}:</strong> Wave speed = frequency {"\u00D7"} wavelength.</p>
        <p><strong className="text-slate-400">Constructive:</strong> Waves in phase add up (bigger amplitude).</p>
        <p><strong className="text-slate-400">Destructive:</strong> Waves 180° out of phase cancel out.</p>
      </div>
    </SimulationContainer>
  );
}
