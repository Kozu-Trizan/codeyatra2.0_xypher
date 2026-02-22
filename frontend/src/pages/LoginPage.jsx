import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/questions";

  // If already logged in, skip the page
  if (user) {
    navigate(user.onboardingDone ? from : "/onboarding", { replace: true });
  }

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({
        email: form.email,
        password: form.password,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(result.user.onboardingDone ? from : "/onboarding", {
        replace: true,
      });
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-brand flex items-center justify-center font-black text-white text-base">
              A
            </div>
            <span className="font-bold text-text-primary text-xl tracking-tight">
              Aarvana
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h1>
          <p className="text-text-secondary text-sm mb-8">
            Log in to continue your learning journey.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:outline-none focus:ring-1 focus:ring-amber-brand transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:outline-none focus:ring-1 focus:ring-amber-brand transition"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-50 active:scale-95 py-2.5 font-semibold text-white transition-all"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-amber-brand hover:text-amber-hover font-medium transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
