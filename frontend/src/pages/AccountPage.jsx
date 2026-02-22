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
        <div className="w-14 h-14 rounded-full bg-amber-brand flex items-center justify-center text-xl font-bold text-text-primary">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{user?.name}</h1>
          <p className="text-text-secondary text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Settings Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-7 mb-6">
        <h2 className="font-semibold text-text-primary mb-6 text-sm uppercase tracking-widest text-text-secondary">
          Study Profile
        </h2>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Class */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
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
                      ? "border-amber-brand bg-amber-brand/10 text-text-primary"
                      : "border-gray-300 bg-gray-100 text-text-secondary hover:border-gray-400"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
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
                      ? "border-gray-200 bg-gray-50 text-text-muted cursor-not-allowed"
                      : subject === s.value
                        ? "border-amber-brand bg-amber-brand/10 text-text-primary"
                        : "border-gray-300 bg-gray-100 text-text-secondary hover:border-gray-400"
                  }`}
                >
                  <span>{s.label}</span>
                  {!s.available && (
                    <span className="text-[10px] text-text-muted bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5">
                      Coming soon
                    </span>
                  )}
                  {subject === s.value && s.available && (
                    <span className="text-amber-brand text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-amber-brand hover:bg-amber-hover active:scale-95 py-2.5 font-semibold text-text-primary transition-all"
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
        <button
          onClick={logout}
          className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-50 px-5 py-2 text-sm font-semibold text-red-500 hover:text-red-500 transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
