import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "sikshyamap_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Persist every change to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  /** Called after signup form submit */
  function signup({ name, email, password }) {
    // In production: POST /api/auth/signup → get JWT
    // For now: store locally, mark onboarding incomplete
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password, // NOTE: never do this in production — backend handles hashing
      onboardingDone: false,
      class: null, // "11" or "12"
      subject: null, // "physics"
    };
    setUser(newUser);
    return newUser;
  }

  /** Called after login form submit */
  function login({ email, password }) {
    // In production: POST /api/auth/login → get JWT
    // For now: check localStorage match
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored)
      return { ok: false, error: "No account found. Please sign up." };
    const parsed = JSON.parse(stored);
    if (parsed.email !== email || parsed.password !== password) {
      return { ok: false, error: "Incorrect email or password." };
    }
    setUser(parsed);
    return { ok: true, user: parsed };
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
  }

  return (
    <AuthContext.Provider
      value={{ user, signup, login, logout, completeOnboarding, updateProfile }}
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
