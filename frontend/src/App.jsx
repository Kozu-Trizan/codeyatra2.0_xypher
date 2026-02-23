import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import QuestionsPage from "./pages/QuestionsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import OnboardingPage from "./pages/OnboardingPage";
import AccountPage from "./pages/AccountPage";
import DiagnosePage from "./pages/DiagnosePage";
import PathfinderPage from "./pages/PathfinderPage";
import ProgressPage from "./pages/ProgressPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-cream-50 text-text-primary">
          <Routes>
            {/* Auth pages — no Navbar */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* App pages — with Navbar */}
            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                      path="/questions"
                      element={
                        <ProtectedRoute>
                          <QuestionsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/diagnose"
                      element={
                        <ProtectedRoute>
                          <DiagnosePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pathfinder"
                      element={
                        <ProtectedRoute>
                          <PathfinderPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/progress"
                      element={
                        <ProtectedRoute>
                          <ProgressPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute>
                          <AccountPage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
