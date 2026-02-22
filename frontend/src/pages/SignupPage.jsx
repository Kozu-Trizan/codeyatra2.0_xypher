import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  if (user) navigate("/", { replace: true });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.email.includes("@")) errs.email = "Enter a valid email.";
    if (form.password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirm)
      errs.confirm = "Passwords do not match.";
    return errs;
  }

  const [serverError, setServerError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setServerError("");
    try {
      const result = await signup({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      navigate("/onboarding", { replace: true });
    } catch {
      setServerError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const field = (name, label, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required
        placeholder={placeholder}
        className={`w-full rounded-lg border ${
          errors[name] ? "border-red-600" : "border-slate-700"
        } bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition`}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-red-400">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-indigo-700/15 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base">
              S
            </div>
            <span className="font-bold text-white text-xl tracking-tight">
              SikshyaMap <span className="text-indigo-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Create your account
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Free forever. No credit card required.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {field("name", "Full Name", "text", "Swarnim Shrestha")}
            {field("email", "Email", "email", "you@example.com")}
            {field("password", "Password", "password", "min 6 characters")}
            {field(
              "confirm",
              "Confirm Password",
              "password",
              "repeat password",
            )}

            {serverError && (
              <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 py-2.5 font-semibold text-white transition-all mt-1"
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
