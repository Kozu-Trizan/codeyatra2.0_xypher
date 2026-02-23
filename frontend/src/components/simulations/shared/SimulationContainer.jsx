import React from "react";

/**
 * Shared wrapper for all simulation types.
 * Provides consistent header, loading, error boundary styling.
 */
export default function SimulationContainer({ title, children, className = "" }) {
  return (
    <div
      className={`max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <span className="text-xl">🧪</span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 p-6">{children}</div>
    </div>
  );
}
