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
      <label className="block text-xs font-medium text-text-secondary mb-1.5">
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
          errors[name] ? "border-red-400" : "border-gray-300"
        } bg-white px-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:outline-none focus:ring-1 focus:ring-amber-brand transition`}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-red-500">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-12">
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
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            Create your account
          </h1>
          <p className="text-text-secondary text-sm mb-8">
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
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-50 active:scale-95 py-2.5 font-semibold text-white transition-all mt-1"
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-amber-brand hover:text-amber-hover font-medium transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
