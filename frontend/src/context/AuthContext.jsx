import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const USER_KEY = "sikshyamap_user";
const TOKEN_KEY = "sikshyamap_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) ?? null,
  );

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Fetch wrapper that attaches Authorization header automatically */
  function authFetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  // ── auth actions ─────────────────────────────────────────────────────────

  /** POST /api/auth/register */
  async function signup({ name, email, password }) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok)
      return { ok: false, error: data.message ?? "Registration failed." };

    const newUser = {
      id: data.user?.id ?? crypto.randomUUID(),
      name: data.user?.name ?? name,
      email,
      onboardingDone: false,
      class: null,
      subject: null,
    };
    setToken(data.access_token ?? null);
    setUser(newUser);
    return { ok: true, user: newUser };
  }

  /** POST /api/auth/login */
  async function login({ email, password }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message ?? "Login failed." };

    const loggedIn = {
      id: data.user?.id ?? "",
      name: data.user?.name ?? email,
      email,
      onboardingDone: data.user?.onboardingDone ?? false,
      class: data.user?.class ?? null,
      subject: data.user?.subject ?? null,
    };
    setToken(data.access_token ?? null);
    setUser(loggedIn);
    return { ok: true, user: loggedIn };
  }

  /** Called after onboarding form submit */
  function completeOnboarding({ studentClass, subject }) {
    setUser((prev) => ({
      ...prev,
      class: studentClass,
      subject,
      onboardingDone: true,
    }));
  }

  /** Update profile from account settings */
  function updateProfile({ studentClass, subject }) {
    setUser((prev) => ({ ...prev, class: studentClass, subject }));
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authFetch,
        signup,
        login,
        logout,
        completeOnboarding,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
