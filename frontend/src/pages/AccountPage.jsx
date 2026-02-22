import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const CLASS_OPTIONS = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
];

const SUBJECT_OPTIONS = [
  { value: "physics", label: "Physics", available: true },
  { value: "chemistry", label: "Chemistry", available: false },
  { value: "maths", label: "Mathematics", available: false },
];

export default function AccountPage() {
  const { user, updateProfile, logout } = useAuth();
  const [studentClass, setStudentClass] = useState(user?.class ?? "");
  const [subject, setSubject] = useState(user?.subject ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    updateProfile({ studentClass, subject });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Avatar initials
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="max-w-xl mx-auto px-6 py-14">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-indigo-700 flex items-center justify-center text-xl font-bold text-white">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user?.name}</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Settings Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 mb-6">
        <h2 className="font-semibold text-white mb-6 text-sm uppercase tracking-widest text-slate-400">
          Study Profile
        </h2>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Class */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Class
            </label>
            <div className="flex gap-3">
              {CLASS_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setStudentClass(c.value)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                    studentClass === c.value
                      ? "border-indigo-500 bg-indigo-950/60 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Subject
            </label>
            <div className="flex flex-col gap-2">
              {SUBJECT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={!s.available}
                  onClick={() => s.available && setSubject(s.value)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold text-left transition-all flex items-center justify-between ${
                    !s.available
                      ? "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                      : subject === s.value
                        ? "border-indigo-500 bg-indigo-950/60 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <span>{s.label}</span>
                  {!s.available && (
                    <span className="text-[10px] text-slate-600 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
                      Coming soon
                    </span>
                  )}
                  {subject === s.value && s.available && (
                    <span className="text-indigo-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 py-2.5 font-semibold text-white transition-all"
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
        <button
          onClick={logout}
          className="rounded-xl border border-red-800/50 bg-red-950/40 hover:bg-red-900/40 px-5 py-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
