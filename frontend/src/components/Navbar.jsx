import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        pathname === to ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white">
          S
        </div>
        <span className="font-bold text-white tracking-tight">
          SikshyaMap
          <span className="text-indigo-400"> AI</span>
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-6">
        {navLink("/", "Home")}
        {navLink("/questions", "Problems")}
        <Link
          to="/questions"
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors"
        >
          Start →
        </Link>
      </div>
    </nav>
  );
}
