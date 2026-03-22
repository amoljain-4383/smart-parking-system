import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Download,
  FileDown,
  HelpCircle,
  Shield,
  Smartphone,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ParkingSlot,
  type ParkingState,
  loadState,
  subscribeToSync,
} from "../lib/parkingStore";

function slotColor(status: ParkingSlot["status"]) {
  switch (status) {
    case "free":
      return { bg: "#22c55e", text: "#052e16", label: "FREE" };
    case "occupied":
      return { bg: "#ef4444", text: "#fff", label: "OCC" };
    case "booked":
      return { bg: "#3b82f6", text: "#fff", label: "BKD" };
    default:
      return { bg: "#374151", text: "#9ca3af", label: "?" };
  }
}

function SlotCard({ slot }: { slot: ParkingSlot }) {
  const c = slotColor(slot.status);
  return (
    <div
      className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all duration-500"
      style={{ background: `${c.bg}22`, border: `2px solid ${c.bg}55` }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: c.bg, color: c.text }}
      >
        {slot.id}
      </div>
      <span
        className="text-[9px] font-semibold tracking-wider"
        style={{ color: c.bg }}
      >
        {c.label}
      </span>
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    startRef.current = null;
    let raf: number;
    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function OccupancyGauge({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 104, height: 104 }}>
        <svg
          width="104"
          height="104"
          style={{ transform: "rotate(-90deg)" }}
          role="img"
          aria-label="Occupancy gauge"
        >
          <circle
            cx="52"
            cy="52"
            r={r}
            fill="none"
            stroke="#ffffff18"
            strokeWidth="8"
          />
          <circle
            cx="52"
            cy="52"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-display font-bold" style={{ color }}>
            {pct}%
          </span>
          <span className="text-[9px] text-muted-foreground">Occupancy</span>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Zap, title: "Real-Time Sync", desc: "All devices update instantly" },
  { icon: Shield, title: "Secure Booking", desc: "Atomic slot locking" },
  { icon: Wifi, title: "IoT Connected", desc: "Arduino + ESP8266" },
  { icon: Clock, title: "24/7 Available", desc: "Round-the-clock management" },
];

function generateAppHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmartPark — Open App</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0f1e;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}
    .logo{width:72px;height:72px;background:linear-gradient(135deg,#3b82f6,#22c55e);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px}
    h1{font-size:2rem;font-weight:800;background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
    .subtitle{color:#94a3b8;font-size:.9rem;margin-bottom:32px}
    .open-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2563eb,#16a34a);color:#fff;text-decoration:none;padding:16px 40px;border-radius:16px;font-size:1.1rem;font-weight:700;margin-bottom:32px}
    .divider{width:100%;max-width:400px;border-top:1px solid #1e293b;margin:24px 0}
    .steps{max-width:400px;text-align:left;background:#111827;border:1px solid #1e293b;border-radius:16px;padding:20px;margin-bottom:16px}
    .steps h3{font-size:.85rem;font-weight:700;color:#60a5fa;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em}
    .steps ol{list-style:none;counter-reset:step}
    .steps li{counter-increment:step;display:flex;align-items:flex-start;gap:10px;font-size:.85rem;color:#94a3b8;margin-bottom:10px;line-height:1.4}
    .steps li::before{content:counter(step);min-width:22px;height:22px;background:#1e40af;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0}
    .footer{margin-top:32px;font-size:.75rem;color:#475569}
    .footer a{color:#60a5fa;text-decoration:none}
  </style>
</head>
<body>
  <div class="logo">&#x1F17F;</div>
  <h1>SmartPark</h1>
  <p class="subtitle">Real-time smart parking management system</p>
  <a href="${url}" class="open-btn">&#x1F680; Open SmartPark</a>
  <div class="divider"></div>
  <div class="steps">
    <h3>&#x1F4F1; Install on Android (Chrome)</h3>
    <ol>
      <li>Open the SmartPark link above in Chrome</li>
      <li>Tap the &#x22EE; menu (top-right corner)</li>
      <li>Tap "Add to Home Screen"</li>
      <li>Tap "Add" — SmartPark appears as an app!</li>
    </ol>
  </div>
  <div class="steps">
    <h3>&#x1F34E; Install on iPhone / Safari</h3>
    <ol>
      <li>Open the SmartPark link above in Safari</li>
      <li>Tap the Share button (square with arrow at bottom)</li>
      <li>Scroll and tap "Add to Home Screen"</li>
      <li>Tap "Add" — SmartPark is on your home screen!</li>
    </ol>
  </div>
  <div class="footer">SmartPark Live &middot; <a href="${url}">${url}</a></div>
</body>
</html>`;
}

function downloadReport(state: ParkingState) {
  const now = new Date().toLocaleString();
  const rows = state.slots
    .map(
      (s) =>
        `<tr><td>${s.id}</td><td>Floor ${s.floor}</td><td style="color:${s.status === "free" ? "#22c55e" : s.status === "occupied" ? "#ef4444" : s.status === "booked" ? "#3b82f6" : "#9ca3af"}">${s.status.toUpperCase()}</td><td>${s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : "-"}</td></tr>`,
    )
    .join("");
  const bookingRows = state.bookings
    .filter((b) => !b.cancelled)
    .map(
      (b) =>
        `<tr><td>${b.token}</td><td>${b.slotId}</td><td>${b.userName}</td><td>${b.carNumber}</td><td>${new Date(b.bookedAt).toLocaleString()}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SmartPark Report</title>
<style>body{font-family:sans-serif;padding:2rem;background:#0f172a;color:#e2e8f0}h1{color:#60a5fa}h2{color:#94a3b8;font-size:1rem}table{border-collapse:collapse;width:100%;margin-bottom:2rem}th{background:#1e293b;padding:8px 12px;text-align:left;font-size:13px}td{padding:8px 12px;border-bottom:1px solid #1e293b;font-size:13px}p{color:#64748b;font-size:13px}</style></head>
<body><h1>&#x1F17F; SmartPark Status Report</h1><p>Generated: ${now}</p>
<h2>PARKING SLOTS</h2><table><tr><th>Slot</th><th>Floor</th><th>Status</th><th>Last Updated</th></tr>${rows}</table>
<h2>ACTIVE BOOKINGS</h2>${bookingRows ? `<table><tr><th>Token</th><th>Slot</th><th>Name</th><th>Car #</th><th>Booked At</th></tr>${bookingRows}</table>` : "<p>No active bookings</p>"}
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "SmartPark_Report.html";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function LandingPage({ onBook }: { onBook: () => void }) {
  const [state, setState] = useState<ParkingState>(loadState);
  const [lastSync, setLastSync] = useState(new Date());
  const [getAppOpen, setGetAppOpen] = useState(false);

  const versionRef = useRef(0);
  useEffect(() => {
    const unsub = subscribeToSync((s) => {
      setState(s);
      if (s.version !== versionRef.current) {
        versionRef.current = s.version;
        setLastSync(new Date());
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const derivedSlots = useMemo(() => {
    const free = state.slots.filter((s) => s.status === "free").length;
    const occupied = state.slots.filter((s) => s.status === "occupied").length;
    const booked = state.slots.filter((s) => s.status === "booked").length;
    const total = state.slots.length;
    const occupancyPct =
      total > 0 ? Math.round(((occupied + booked) / total) * 100) : 0;
    const floorA = state.slots.filter((s) => s.floor === "A");
    const floorB = state.slots.filter((s) => s.floor === "B");
    const otherFloors = [...new Set(state.slots.map((s) => s.floor))].filter(
      (f) => f !== "A" && f !== "B",
    );
    return {
      free,
      occupied,
      booked,
      total,
      occupancyPct,
      floorA,
      floorB,
      otherFloors,
    };
  }, [state.slots]);
  const {
    free,
    occupied,
    booked,
    total,
    occupancyPct,
    floorA,
    floorB,
    otherFloors,
  } = derivedSlots;

  const activeBookings = useMemo(
    () => state.bookings.filter((b) => !b.cancelled).length,
    [state.bookings],
  );

  const countTotal = useCountUp(total);
  const countBookings = useCountUp(activeBookings);
  const countDevices = useCountUp(3);

  const handleDownloadShortcut = () => {
    const url = window.location.href;
    const html = generateAppHtml(url);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "SmartPark.html";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="app-shell"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Floating orb blobs */}
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
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "oklch(0.55 0.18 250 / 0.12)",
            filter: "blur(80px)",
            top: -80,
            left: -60,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "oklch(0.65 0.2 145 / 0.10)",
            filter: "blur(70px)",
            top: 200,
            right: -80,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "oklch(0.6 0.22 310 / 0.09)",
            filter: "blur(60px)",
            bottom: 120,
            left: 40,
          }}
        />
      </div>

      {/* Header */}
      <header
        className="app-header"
        style={{ position: "relative", zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <a
            href="/SmartPark.html"
            download="SmartPark.html"
            className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-3 py-1.5"
            style={{
              background: "#16a34a",
              border: "1px solid #22c55e55",
              textDecoration: "none",
            }}
            data-ocid="landing.download_direct_button"
          >
            <Download className="w-3.5 h-3.5" />
            Download App
          </a>
          <button
            type="button"
            onClick={() => setGetAppOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5"
            style={{
              background: "transparent",
              border: "1px solid #22c55e55",
              color: "#86efac",
            }}
            data-ocid="landing.open_modal_button"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Install
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-display font-bold text-lg tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #60a5fa, #34d399, #818cf8, #60a5fa)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SmartPark
          </span>
          {state.demoMode && (
            <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5 font-bold tracking-wider">
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PulsingDot />
            <span className="hidden sm:inline">Live</span>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white"
            onClick={onBook}
            data-ocid="landing.primary_button"
          >
            Login
          </Button>
        </div>
      </header>

      <main
        className="app-content space-y-6"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-2 pb-1 space-y-2"
        >
          <h1
            className="text-3xl font-display font-black tracking-tight leading-tight"
            style={{
              background:
                "linear-gradient(135deg, #60a5fa 0%, #34d399 40%, #818cf8 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Smart Parking
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time cloud-connected parking management
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {[
              { emoji: "⚡", label: "Real-Time", delay: "0s" },
              { emoji: "🔒", label: "Secure", delay: "0.3s" },
              { emoji: "📡", label: "IoT Ready", delay: "0.6s" },
              { emoji: "🌐", label: "Cloud Sync", delay: "0.9s" },
            ].map((pill) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Number(pill.delay), duration: 0.3 }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "oklch(0.22 0.05 250)",
                  border: "1px solid oklch(0.5 0.15 250 / 0.3)",
                  color: "oklch(0.75 0.15 250)",
                }}
              >
                {pill.emoji} {pill.label}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Live Status Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-4 space-y-4"
          style={{
            background: "oklch(0.17 0.04 250 / 0.95)",
            border: "1px solid oklch(1 0 0 / 10%)",
            backdropFilter: "blur(12px)",
          }}
          data-ocid="landing.section"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-foreground">
              🅿️ Live Parking Status
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {lastSync.toLocaleTimeString()}
              </span>
              <PulsingDot />
            </div>
          </div>

          {/* Occupancy gauge + stats */}
          <div className="flex items-center gap-3">
            <OccupancyGauge pct={occupancyPct} />
            <div className="flex-1 grid grid-cols-1 gap-2">
              <div
                className="rounded-xl p-2.5 flex items-center justify-between"
                style={{
                  background: "#22c55e18",
                  border: "1px solid #22c55e33",
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Free
                </div>
                <div className="text-lg font-bold text-green-400">{free}</div>
              </div>
              <div
                className="rounded-xl p-2.5 flex items-center justify-between"
                style={{
                  background: "#ef444418",
                  border: "1px solid #ef444433",
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> Occupied
                </div>
                <div className="text-lg font-bold text-red-400">{occupied}</div>
              </div>
              <div
                className="rounded-xl p-2.5 flex items-center justify-between"
                style={{
                  background: "#3b82f618",
                  border: "1px solid #3b82f633",
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
                  <Circle className="w-3.5 h-3.5" /> Booked
                </div>
                <div className="text-lg font-bold text-blue-400">{booked}</div>
              </div>
            </div>
          </div>

          {/* Floor grids */}
          {floorA.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Floor A
              </div>
              <div className="grid grid-cols-3 gap-2">
                {floorA.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} />
                ))}
              </div>
            </div>
          )}
          {floorA.length > 0 && floorB.length > 0 && (
            <div className="border-t border-dashed border-white/10" />
          )}
          {floorB.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Floor B
              </div>
              <div className="grid grid-cols-3 gap-2">
                {floorB.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} />
                ))}
              </div>
            </div>
          )}
          {otherFloors.map((f) => (
            <div key={f}>
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Floor {f}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {state.slots
                  .filter((s) => s.floor === f)
                  .map((slot) => (
                    <SlotCard key={slot.id} slot={slot} />
                  ))}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            {(
              [
                ["#22c55e", "Free"],
                ["#ef4444", "Occupied"],
                ["#3b82f6", "Booked"],
                ["#374151", "No Data"],
              ] as [string, string][]
            ).map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ background: c }}
                />
                {l}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              onClick={onBook}
              data-ocid="landing.secondary_button"
            >
              Book a Slot <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              className="border-white/10 text-foreground hover:bg-white/5"
              onClick={() => downloadReport(state)}
              data-ocid="landing.report_button"
            >
              <FileDown className="w-4 h-4 mr-1" /> Report
            </Button>
          </div>
        </motion.div>

        {/* Animated Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Total Spots", value: countTotal, color: "#818cf8" },
            {
              label: "Active Bookings",
              value: countBookings,
              color: "#34d399",
            },
            { label: "Live Devices", value: countDevices, color: "#60a5fa" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-3 text-center"
              style={{
                background: `${s.color}12`,
                border: `1px solid ${s.color}30`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="text-2xl font-display font-bold"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* What is SmartPark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="font-display font-bold text-base text-foreground">
            What is SmartPark?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-3 space-y-1.5"
                style={{
                  background: "oklch(0.17 0.04 250 / 0.95)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <f.icon className="w-5 h-5 text-blue-400" />
                <div className="text-xs font-semibold text-foreground">
                  {f.title}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Arduino section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "oklch(0.17 0.04 250 / 0.95)",
            border: "1px solid oklch(1 0 0 / 8%)",
            backdropFilter: "blur(8px)",
          }}
        >
          <h3 className="font-display font-semibold text-sm text-foreground">
            Arduino + ESP8266 Connected
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Parking sensors detect vehicles in real time. The ESP8266 WiFi
            module sends data to SmartPark's API. All devices see the same live
            status — no delays, no manual refresh.
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <HelpCircle className="w-4 h-4" />
            <span>Admin → IoT Panel for full setup guide and Arduino code</span>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-muted-foreground pb-4">
          © {new Date().getFullYear()} SmartPark. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </footer>
      </main>

      {/* Get App Dialog */}
      <Dialog open={getAppOpen} onOpenChange={setGetAppOpen}>
        <DialogContent
          className="rounded-2xl border-white/10 max-w-[360px]"
          style={{ background: "oklch(0.15 0.04 250)" }}
          data-ocid="getapp.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-400" />
              Install SmartPark
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="android">
            <TabsList className="w-full bg-white/5">
              <TabsTrigger
                value="android"
                className="flex-1 text-xs"
                data-ocid="getapp.tab"
              >
                🤖 Android
              </TabsTrigger>
              <TabsTrigger
                value="ios"
                className="flex-1 text-xs"
                data-ocid="getapp.tab"
              >
                🍎 iPhone / iOS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="android" className="mt-3 space-y-3">
              <div
                className="rounded-xl p-3 space-y-2"
                style={{
                  background: "oklch(0.12 0.03 250)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                {[
                  "Open this page in Chrome on your Android phone",
                  "Tap the ⋮ menu (top-right corner)",
                  'Tap "Add to Home Screen"',
                  'Tap "Add" — SmartPark appears on your home screen!',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <span
                      className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "#16a34a" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-green-400/70 text-center">
                ✅ Works on Chrome, Samsung Internet, and Edge
              </p>
            </TabsContent>

            <TabsContent value="ios" className="mt-3 space-y-3">
              <div
                className="rounded-xl p-3 space-y-2"
                style={{
                  background: "oklch(0.12 0.03 250)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                {[
                  "Open this page in Safari on your iPhone or iPad",
                  "Tap the Share button (square with ↑ arrow at the bottom)",
                  'Scroll and tap "Add to Home Screen"',
                  'Tap "Add" — SmartPark is on your home screen!',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <span
                      className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "#2563eb" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-blue-400/70 text-center">
                ℹ️ Must use Safari — Chrome on iOS will not work
              </p>
            </TabsContent>
          </Tabs>

          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="flex-1 h-px bg-white/10" />
              <span>or download a shortcut file</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <Button
              variant="outline"
              className="w-full border-white/10 text-foreground hover:bg-white/5 text-xs gap-2"
              onClick={handleDownloadShortcut}
              data-ocid="getapp.download_button"
            >
              <FileDown className="w-4 h-4" />
              Download SmartPark.html
            </Button>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              A branded page with the app link and install instructions you can
              save offline.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
