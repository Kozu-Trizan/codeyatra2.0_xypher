import React from "react";

const STYLES = {
  success: {
    border: "border-emerald-700",
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    icon: "✓",
  },
  error: {
    border: "border-red-700",
    bg: "bg-red-950/40",
    text: "text-red-300",
    icon: "✗",
  },
  info: {
    border: "border-blue-700",
    bg: "bg-blue-950/40",
    text: "text-blue-300",
    icon: "ℹ",
  },
};

export default function FeedbackOverlay({ type = "info", message, onDismiss }) {
  const s = STYLES[type] || STYLES.info;

  return (
    <div
      className={`rounded-xl border ${s.border} ${s.bg} px-5 py-4 flex items-start gap-3`}
    >
      <span className={`text-lg font-bold ${s.text}`}>{s.icon}</span>
      <p className={`text-sm flex-1 ${s.text}`}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-white text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}
