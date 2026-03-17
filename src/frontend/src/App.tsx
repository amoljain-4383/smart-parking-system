import { useEffect, useState } from "react";
import { initializeParkingState } from "./lib/parkingStore";
import AdminDashboard from "./pages/AdminDashboard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import UserDashboard from "./pages/UserDashboard";

export type Session = {
  role: "admin" | "user";
  username?: string;
  name?: string;
  carNumber?: string;
};

export type AppPage = "landing" | "login" | "admin" | "user";

export default function App() {
  const [page, setPage] = useState<AppPage>("landing");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    initializeParkingState();
    const stored = localStorage.getItem("parkingSession");
    if (stored) {
      const s = JSON.parse(stored) as Session;
      setSession(s);
      setPage(s.role === "admin" ? "admin" : "user");
    }
  }, []);

  const handleLogin = (s: Session) => {
    setSession(s);
    localStorage.setItem("parkingSession", JSON.stringify(s));
    setPage(s.role === "admin" ? "admin" : "user");
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("parkingSession");
    setPage("landing");
  };

  if (page === "landing")
    return (
      <LandingPage
        onBook={() => setPage("login")}
        onAdmin={() => setPage("login")}
      />
    );
  if (page === "login")
    return (
      <LoginPage onLogin={handleLogin} onBack={() => setPage("landing")} />
    );
  if (page === "admin" && session)
    return <AdminDashboard session={session} onLogout={handleLogout} />;
  if (page === "user" && session)
    return <UserDashboard session={session} onLogout={handleLogout} />;
  return null;
}
