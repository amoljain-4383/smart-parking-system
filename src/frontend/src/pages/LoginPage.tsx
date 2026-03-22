import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Car, Lock, Shield, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Session } from "../App";

const ADMINS = [
  { username: "admin", password: "admin123" },
  { username: "Amol4383", password: "Amol@4383" },
];

type LoginMode = "user" | "admin";

export default function LoginPage({
  onLogin,
  onBack,
}: {
  onLogin: (s: Session) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<LoginMode>("user");
  const [name, setName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUserLogin = () => {
    if (!name.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (!carNumber.trim()) {
      toast.error("Enter car number");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({
        role: "user",
        name: name.trim(),
        carNumber: carNumber.trim().toUpperCase(),
      });
    }, 400);
  };

  const handleAdminLogin = () => {
    const match = ADMINS.find(
      (a) => a.username === username && a.password === password,
    );
    if (!match) {
      toast.error("Invalid admin credentials");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ role: "admin", username: match.username });
    }, 400);
  };

  return (
    <div
      className="app-shell flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "oklch(0.1 0.025 240)" }}
    >
      {/* Floating orbs */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "oklch(0.55 0.18 195 / 0.15)",
            filter: "blur(80px)",
            top: -60,
            left: -60,
            animation: "orbFloat1 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "oklch(0.35 0.15 285 / 0.12)",
            filter: "blur(70px)",
            bottom: 100,
            right: -60,
            animation: "orbFloat2 10s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "oklch(0.72 0.18 60 / 0.10)",
            filter: "blur(60px)",
            top: "50%",
            left: "60%",
            animation: "orbFloat3 12s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes orbFloat1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(30px)} }
          @keyframes orbFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-25px)} }
          @keyframes orbFloat3 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-20px) translateX(15px)} }
        `}</style>
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 py-8">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit"
          data-ocid="login.link"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
            }}
          >
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1
            className="font-display font-black text-2xl tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.75 0.15 195), oklch(0.85 0.1 60))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Smart
            <span style={{ WebkitTextFillColor: "oklch(0.75 0.18 195)" }}>
              Park
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time smart parking system
          </p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            {
              id: "user" as LoginMode,
              icon: User,
              label: "Driver",
              sub: "Find & book spots",
            },
            {
              id: "admin" as LoginMode,
              icon: Shield,
              label: "Admin",
              sub: "Manage parking lot",
            },
          ].map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setMode(r.id)}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-200"
              style={{
                background:
                  mode === r.id
                    ? r.id === "user"
                      ? "oklch(0.55 0.18 195 / 0.2)"
                      : "oklch(0.5 0.2 285 / 0.2)"
                    : "oklch(0.15 0.035 245)",
                border:
                  mode === r.id
                    ? r.id === "user"
                      ? "2px solid oklch(0.55 0.18 195 / 0.6)"
                      : "2px solid oklch(0.5 0.2 285 / 0.6)"
                    : "2px solid oklch(0.28 0.04 245 / 40%)",
                transform: mode === r.id ? "scale(1.02)" : "scale(1)",
              }}
              data-ocid="login.tab"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    mode === r.id
                      ? r.id === "user"
                        ? "oklch(0.55 0.18 195)"
                        : "oklch(0.5 0.2 285)"
                      : "oklch(0.22 0.03 245)",
                }}
              >
                <r.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">
                  {r.label}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Form card */}
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "oklch(0.15 0.035 245 / 0.9)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
            backdropFilter: "blur(12px)",
          }}
        >
          {mode === "user" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  style={
                    {
                      "--tw-ring-color": "oklch(0.55 0.18 195)",
                    } as React.CSSProperties
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleUserLogin()}
                  data-ocid="login.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Car Number
                </Label>
                <Input
                  value={carNumber}
                  onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH12AB1234"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleUserLogin()}
                  data-ocid="login.search_input"
                />
              </div>
              <Button
                className="w-full font-bold text-white h-14 text-base rounded-xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.60 0.20 195), oklch(0.48 0.22 210))",
                  boxShadow: "0 4px 24px oklch(0.55 0.18 195 / 0.45)",
                  letterSpacing: "0.01em",
                }}
                onClick={handleUserLogin}
                disabled={loading}
                data-ocid="login.submit_button"
              >
                {loading ? "Logging in..." : "🚗 Enter Parking"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Username
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  data-ocid="login.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  data-ocid="login.search_input"
                />
              </div>
              <Button
                className="w-full font-bold text-white h-14 text-base rounded-xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.22 285), oklch(0.42 0.24 268))",
                  boxShadow: "0 4px 24px oklch(0.5 0.2 285 / 0.45)",
                  letterSpacing: "0.01em",
                }}
                onClick={handleAdminLogin}
                disabled={loading}
                data-ocid="login.submit_button"
              >
                {loading ? "Verifying..." : "🔐 Admin Login"}
              </Button>
            </>
          )}
        </motion.div>

        <div className="flex items-center gap-2 mt-6">
          <div
            className="flex-1 h-px"
            style={{ background: "oklch(0.28 0.04 245 / 40%)" }}
          />
          <span className="text-[11px] text-muted-foreground">
            SmartPark Live
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "oklch(0.28 0.04 245 / 40%)" }}
          />
        </div>
      </div>
    </div>
  );
}

import type React from "react";
