import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Cpu,
  CreditCard,
  Download,
  FileDown,
  FlipVertical,
  Grid3X3,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Terminal,
  Trash2,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "../App";
import {
  type ParkingSlot,
  type ParkingState,
  type SlotStatus,
  adminOverrideSlot,
  adminResetAll,
  cancelBooking,
  loadState,
  saveState,
  sensorUpdate,
  setAdminAnnouncement,
  setHourlyRate,
  subscribeToSync,
} from "../lib/parkingStore";

type MainTab = "overview" | "spots" | "bookings" | "iot";
type ExtraTab =
  | "floors"
  | "analytics"
  | "reservations"
  | "payments"
  | "settings"
  | "demo";
type Tab = MainTab | ExtraTab;

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function OccupancyRing({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 96, height: 96 }}>
        <svg
          width="96"
          height="96"
          style={{ transform: "rotate(-90deg)" }}
          role="img"
          aria-label="Occupancy ring"
        >
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="#ffffff12"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
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

function slotStyle(status: SlotStatus) {
  switch (status) {
    case "free":
      return { dot: "#22c55e", label: "Free" };
    case "occupied":
      return { dot: "#ef4444", label: "Occupied" };
    case "booked":
      return { dot: "#3b82f6", label: "Booked" };
    default:
      return { dot: "#6b7280", label: "No Data" };
  }
}

function downloadCSV(state: ParkingState) {
  const header = "Token,SlotID,Name,Car,BookedAt,Status";
  const rows = state.bookings.map(
    (b) =>
      `${b.token},${b.slotId},${b.userName},${b.carNumber},${b.bookedAt},${b.cancelled ? "Cancelled" : "Active"}`,
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "SmartPark_Bookings.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadAppFile() {
  const url = window.location.href;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${url}"><title>SmartPark</title></head><body><p>Opening SmartPark... <a href="${url}">Click here</a></p></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "SmartPark.html";
  a.click();
  URL.revokeObjectURL(a.href);
}

const MAIN_TABS = [
  { id: "overview" as MainTab, icon: LayoutDashboard, label: "Overview" },
  { id: "spots" as MainTab, icon: Grid3X3, label: "Spots" },
  { id: "bookings" as MainTab, icon: CalendarDays, label: "Bookings" },
  { id: "iot" as MainTab, icon: Cpu, label: "IoT" },
];

const MORE_TABS = [
  {
    id: "floors" as ExtraTab,
    icon: Building2,
    label: "Floor Control",
    desc: "Manage parking floors",
  },
  {
    id: "analytics" as ExtraTab,
    icon: BarChart3,
    label: "Analytics",
    desc: "Occupancy & revenue stats",
  },
  {
    id: "reservations" as ExtraTab,
    icon: CalendarDays,
    label: "Reservations",
    desc: "All reservations detail",
  },
  {
    id: "payments" as ExtraTab,
    icon: CreditCard,
    label: "Payments",
    desc: "Payment tracking",
  },
  {
    id: "settings" as ExtraTab,
    icon: Settings,
    label: "Settings",
    desc: "Rate, announcements",
  },
  {
    id: "demo" as ExtraTab,
    icon: FlipVertical,
    label: "Demo Control",
    desc: "Stage & test slot changes",
  },
];

export default function AdminDashboard({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [state, setState] = useState<ParkingState>(loadState);
  const [lastSync, setLastSync] = useState(new Date());
  const [moreOpen, setMoreOpen] = useState(false);
  // Slot edit
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [editStatus, setEditStatus] = useState<SlotStatus>("free");
  // Spot search/filter
  const [spotSearch, setSpotSearch] = useState("");
  const [spotFloor, setSpotFloor] = useState("all");
  // Booking search
  const [bookingSearch, setBookingSearch] = useState("");
  // Add slot
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [newSlotId, setNewSlotId] = useState("");
  const [newSlotFloor, setNewSlotFloor] = useState("A");
  // Rate / announcement
  const [rateInput, setRateInput] = useState(String(loadState().hourlyRate));
  const [announcement, setAnnouncement] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  // IoT
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [sensorSlot, setSensorSlot] = useState("A1");
  const [sensorOccupied, setSensorOccupied] = useState(true);
  const [iotLoading, setIotLoading] = useState(false);
  const [cmdLog, setCmdLog] = useState<
    { time: string; cmd: string; result: string }[]
  >([]);
  const [wsAddress, setWsAddress] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [rawJson, setRawJson] = useState("");
  // Floor control
  const [newFloorName, setNewFloorName] = useState("");
  const [addFloorOpen, setAddFloorOpen] = useState(false);
  // Demo
  const [staged, setStaged] = useState<Record<string, SlotStatus>>({});
  const [demoSlot, setDemoSlot] = useState<string | null>(null);
  const [demoEditStatus, setDemoEditStatus] = useState<SlotStatus>("free");
  const [demoAccessEnabled, setDemoAccessEnabled] = useState(false);
  // External DB state
  const [extDbType, setExtDbType] = useState("firebase");
  const [extDbUrl, setExtDbUrl] = useState("");
  const [extDbKey, setExtDbKey] = useState("");
  const [extDbStatus, setExtDbStatus] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");

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

  const handleOverride = useCallback(() => {
    if (!selectedSlot) return;
    const slotId = selectedSlot.id;
    const status = editStatus;
    setSelectedSlot(null);
    try {
      adminOverrideSlot(slotId, status);
      setState(loadState());
      toast.success(`Slot ${slotId} set to ${status}`);
    } catch {
      toast.error("Failed to update slot status");
    }
  }, [selectedSlot, editStatus]);

  const handleReset = useCallback(() => {
    adminResetAll();
    setState(loadState());
    toast.success("All slots reset to Free");
  }, []);

  const handleClearExpired = useCallback(() => {
    const s = loadState();
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const b of s.bookings) {
      if (!b.cancelled && new Date(b.bookedAt).getTime() < cutoff) {
        b.cancelled = true;
        const slot = s.slots.find((sl) => sl.id === b.slotId);
        if (slot && slot.status === "booked" && slot.bookingToken === b.token) {
          slot.status = "free";
          slot.bookedBy = undefined;
          slot.bookingToken = undefined;
        }
      }
    }
    saveState(s);
    setState(loadState());
    toast.success("Expired bookings cleared");
  }, []);

  const handleCancelBooking = useCallback((token: string) => {
    cancelBooking(token);
    setState(loadState());
    toast.success("Booking cancelled");
  }, []);

  const handleSensorTest = useCallback(() => {
    setIotLoading(true);
    const now = new Date().toLocaleTimeString();
    setTimeout(() => {
      sensorUpdate(sensorSlot, sensorOccupied);
      setState(loadState());
      setIotLoading(false);
      const result = `Slot ${sensorSlot} → ${sensorOccupied ? "OCCUPIED" : "FREE"}`;
      setCmdLog((prev) => [
        {
          time: now,
          cmd: `POST /api/sensor {slotId: "${sensorSlot}", occupied: ${sensorOccupied}}`,
          result,
        },
        ...prev.slice(0, 9),
      ]);
      toast.success(result);
    }, 800);
  }, [sensorSlot, sensorOccupied]);

  const handleSaveRate = useCallback(() => {
    const r = Number(rateInput);
    if (!r || r < 1) {
      toast.error("Invalid rate");
      return;
    }
    setHourlyRate(r);
    setState(loadState());
    toast.success(`Rate updated to ₹${r}/hr`);
  }, [rateInput]);

  const handleAnnouncement = useCallback(() => {
    setAdminAnnouncement(announcement);
    setState(loadState());
    toast.success("Announcement posted");
  }, [announcement]);

  const handleBroadcast = useCallback(() => {
    if (!broadcastMsg.trim()) {
      toast.error("Enter a message");
      return;
    }
    setAdminAnnouncement(broadcastMsg.trim());
    setState(loadState());
    setBroadcastMsg("");
    setBroadcastOpen(false);
    toast.success("📢 Broadcast sent to all users");
  }, [broadcastMsg]);

  const handleAddSlot = useCallback(() => {
    if (!newSlotId.trim()) {
      toast.error("Enter a slot ID");
      return;
    }
    const s = loadState();
    if (s.slots.find((sl) => sl.id === newSlotId.trim())) {
      toast.error("Slot ID already exists");
      return;
    }
    s.slots.push({
      id: newSlotId.trim(),
      floor: newSlotFloor,
      status: "unknown",
      lastUpdated: new Date().toISOString(),
    });
    saveState(s);
    setState(loadState());
    setAddSlotOpen(false);
    setNewSlotId("");
    toast.success(`Slot ${newSlotId.trim()} added`);
  }, [newSlotId, newSlotFloor]);

  const handleRemoveSlot = useCallback((slotId: string) => {
    const s = loadState();
    s.slots = s.slots.filter((sl) => sl.id !== slotId);
    saveState(s);
    setState(loadState());
    toast.success(`Slot ${slotId} removed`);
  }, []);

  const handleAddFloor = useCallback(() => {
    if (!newFloorName.trim()) {
      toast.error("Enter a floor name");
      return;
    }
    const s = loadState();
    const name = newFloorName.trim().toUpperCase();
    if (s.slots.some((sl) => sl.floor === name)) {
      toast.error("Floor already exists");
      return;
    }
    s.slots.push({
      id: `${name}1`,
      floor: name,
      status: "unknown",
      lastUpdated: new Date().toISOString(),
    });
    saveState(s);
    setState(loadState());
    setAddFloorOpen(false);
    setNewFloorName("");
    toast.success(`Floor ${name} added`);
  }, [newFloorName]);

  const handleRemoveFloor = useCallback((floor: string) => {
    const s = loadState();
    s.slots = s.slots.filter((sl) => sl.floor !== floor);
    saveState(s);
    setState(loadState());
    toast.success(`Floor ${floor} removed`);
  }, []);

  const toggleDemoMode = useCallback(() => {
    const s = loadState();
    s.demoMode = !s.demoMode;
    saveState(s);
    setState(loadState());
    toast.success(s.demoMode ? "Demo Mode ON" : "Demo Mode OFF");
  }, []);

  const applyStaged = useCallback(() => {
    const snapshot = { ...staged };
    setStaged({});
    try {
      for (const [slotId, status] of Object.entries(snapshot)) {
        adminOverrideSlot(slotId, status);
      }
      setState(loadState());
      toast.success("Staged changes applied");
    } catch {
      toast.error("Failed to apply staged changes");
    }
  }, [staged]);

  const handleWsConnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
      return;
    }
    try {
      const ws = new WebSocket(wsAddress);
      ws.onopen = () => {
        setWsConnected(true);
        setWsLog((p) => [
          `[${new Date().toLocaleTimeString()}] Connected`,
          ...p.slice(0, 19),
        ]);
      };
      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        setWsLog((p) => [
          `[${new Date().toLocaleTimeString()}] Disconnected`,
          ...p.slice(0, 19),
        ]);
      };
      ws.onmessage = (e) => {
        setWsLog((p) => [
          `[${new Date().toLocaleTimeString()}] ${e.data}`,
          ...p.slice(0, 19),
        ]);
        try {
          const data = JSON.parse(e.data as string) as {
            slotId?: string;
            occupied?: boolean;
          };
          if (data.slotId !== undefined && data.occupied !== undefined) {
            sensorUpdate(data.slotId, data.occupied);
            setState(loadState());
          }
        } catch {
          /* ignore */
        }
      };
      wsRef.current = ws;
    } catch {
      toast.error("Invalid WebSocket address");
    }
  }, [wsAddress]);

  const handleRawJson = useCallback(() => {
    try {
      const arr = JSON.parse(rawJson) as {
        slotId: string;
        occupied: boolean;
      }[];
      for (const item of arr) sensorUpdate(item.slotId, item.occupied);
      setState(loadState());
      toast.success(`Applied ${arr.length} sensor updates`);
    } catch {
      toast.error("Invalid JSON format");
    }
  }, [rawJson]);

  const free = useMemo(
    () => state.slots.filter((s) => s.status === "free").length,
    [state.slots],
  );
  const occupied = useMemo(
    () => state.slots.filter((s) => s.status === "occupied").length,
    [state.slots],
  );
  const booked = useMemo(
    () => state.slots.filter((s) => s.status === "booked").length,
    [state.slots],
  );
  const activeBookings = useMemo(
    () => state.bookings.filter((b) => !b.cancelled),
    [state.bookings],
  );
  const floors = useMemo(
    () => [...new Set(state.slots.map((s) => s.floor))],
    [state.slots],
  );
  const occupancyPct = useMemo(
    () =>
      state.slots.length > 0
        ? Math.round(((occupied + booked) / state.slots.length) * 100)
        : 0,
    [state.slots.length, occupied, booked],
  );

  const filteredSlots = useMemo(
    () =>
      state.slots.filter((s) => {
        const matchSearch = s.id
          .toLowerCase()
          .includes(spotSearch.toLowerCase());
        const matchFloor = spotFloor === "all" || s.floor === spotFloor;
        return matchSearch && matchFloor;
      }),
    [state.slots, spotSearch, spotFloor],
  );

  const filteredBookings = useMemo(
    () =>
      state.bookings.filter(
        (b) =>
          b.token.toLowerCase().includes(bookingSearch.toLowerCase()) ||
          b.carNumber.toLowerCase().includes(bookingSearch.toLowerCase()) ||
          b.userName.toLowerCase().includes(bookingSearch.toLowerCase()),
      ),
    [state.bookings, bookingSearch],
  );

  const reversedFilteredBookings = useMemo(
    () => [...filteredBookings].reverse(),
    [filteredBookings],
  );
  const reversedBookings = useMemo(
    () => [...state.bookings].reverse(),
    [state.bookings],
  );
  const recentActivity = useMemo(
    () => reversedBookings.slice(0, 5),
    [reversedBookings],
  );

  const extraTabLabel = useMemo(
    () => MORE_TABS.find((t) => t.id === tab)?.label,
    [tab],
  );

  const visibleMoreTabs = useMemo(
    () => MORE_TABS.filter((t) => t.id !== "demo" || demoAccessEnabled),
    [demoAccessEnabled],
  );

  useEffect(() => {
    if (tab === "demo" && !demoAccessEnabled) setTab("settings");
  }, [tab, demoAccessEnabled]);

  const demoSlotGrid = useMemo(
    () =>
      floors.map((floor) => (
        <div key={floor}>
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            🏢 Floor {floor}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {state.slots
              .filter((s) => s.floor === floor)
              .map((slot) => {
                const effectiveStatus = staged[slot.id] ?? slot.status;
                const s = slotStyle(effectiveStatus);
                const isPending = slot.id in staged;
                return (
                  <button
                    type="button"
                    key={slot.id}
                    className="rounded-xl p-3 flex flex-col items-center gap-1 hover:brightness-110 transition-colors relative"
                    style={{
                      background: `${s.dot}18`,
                      border: `2px solid ${isPending ? "#f97316" : `${s.dot}44`}`,
                    }}
                    onClick={() => {
                      setDemoSlot(slot.id);
                      setDemoEditStatus(effectiveStatus);
                    }}
                    data-ocid={`demo.slot.${slot.id}`}
                  >
                    {isPending && (
                      <span className="absolute top-1 right-1 text-[8px] text-orange-400 font-bold">
                        STAGED
                      </span>
                    )}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: s.dot }}
                    >
                      {slot.id}
                    </div>
                    <span
                      className="text-[9px] font-semibold tracking-wider"
                      style={{ color: s.dot }}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )),
    [floors, state.slots, staged],
  );

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
            }}
          >
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm text-foreground">
                Admin{" "}
                <span style={{ color: "oklch(0.7 0.15 285)" }}>Panel</span>
              </span>
              {state.demoMode && (
                <span
                  className="text-[9px] rounded px-1.5 py-0.5 font-bold tracking-wider"
                  style={{
                    background: "#f9731620",
                    color: "#f97316",
                    border: "1px solid #f9731630",
                  }}
                >
                  DEMO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <PulsingDot />
              <span className="text-[9px] text-muted-foreground">
                Live · {lastSync.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadAppFile}
            className="flex items-center gap-1 text-[11px] font-semibold text-white rounded-lg px-2.5 py-1.5"
            style={{ background: "#16a34a", border: "1px solid #22c55e55" }}
            data-ocid="admin.download_button"
          >
            <Download className="w-3 h-3" /> App
          </button>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2.5 py-1.5"
            style={{
              background: "oklch(0.5 0.2 285 / 0.2)",
              border: "1px solid oklch(0.5 0.2 285 / 0.4)",
              color: "oklch(0.75 0.15 285)",
            }}
            onClick={() => setBroadcastOpen(true)}
            data-ocid="admin.secondary_button"
          >
            <Bell className="w-3 h-3" /> Broadcast
          </button>
          <span
            className="text-xs font-medium"
            style={{ color: "oklch(0.7 0.15 285)" }}
          >
            {session.username}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onLogout}
            data-ocid="admin.button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="app-content">
        {/* Extra tab breadcrumb */}
        {extraTabLabel && (
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setTab("overview")}
            >
              ← Back
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">
              {extraTabLabel}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ---- OVERVIEW ---- */}
          {tab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h2 className="font-display font-bold text-base text-foreground">
                Overview
              </h2>

              {/* Occupancy + Stats row */}
              <div className="flex items-start gap-3">
                <OccupancyRing pct={occupancyPct} />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Total Slots",
                      count: state.slots.length,
                      color: "#8b5cf6",
                    },
                    { label: "Free", count: free, color: "#22c55e" },
                    { label: "Occupied", count: occupied, color: "#ef4444" },
                    { label: "Booked", count: booked, color: "#3b82f6" },
                  ].map((st) => (
                    <div
                      key={st.label}
                      className="rounded-xl p-2.5 relative overflow-hidden"
                      style={{
                        background: `${st.color}18`,
                        border: `1px solid ${st.color}33`,
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          background: `radial-gradient(circle at 100% 0%, ${st.color}40, transparent 70%)`,
                        }}
                      />
                      <div
                        className="text-xl font-bold relative"
                        style={{ color: st.color }}
                      >
                        {st.count}
                      </div>
                      <div
                        className="text-[10px] relative"
                        style={{ color: `${st.color}aa` }}
                      >
                        {st.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              {state.bookings.length > 0 && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: "oklch(0.15 0.035 245)",
                    border: "1px solid oklch(0.28 0.04 245 / 40%)",
                  }}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Activity
                  </h3>
                  {recentActivity.map((b) => (
                    <div
                      key={b.token}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.cancelled ? "bg-red-400" : "bg-green-400"}`}
                      />
                      <span className="text-foreground flex-1 truncate">
                        {b.cancelled ? "Cancelled" : "Booked"} Slot {b.slotId} —{" "}
                        {b.userName}
                      </span>
                      <span className="text-muted-foreground text-[10px] flex-shrink-0">
                        {new Date(b.bookedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Quick Actions
                </h3>
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-foreground hover:bg-white/5 justify-start gap-2"
                  onClick={handleReset}
                  data-ocid="admin.primary_button"
                >
                  <RefreshCw className="w-4 h-4 text-green-400" /> Reset All
                  Slots to Free
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-foreground hover:bg-white/5 justify-start gap-2"
                  onClick={handleClearExpired}
                  data-ocid="admin.clear_expired_button"
                >
                  <XCircle className="w-4 h-4 text-yellow-400" /> Clear Expired
                  Bookings (&gt;6h)
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-foreground hover:bg-white/5 justify-start gap-2"
                  onClick={() => downloadCSV(state)}
                  data-ocid="admin.export_button"
                >
                  <FileDown className="w-4 h-4 text-blue-400" /> Export CSV
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  style={{
                    borderColor: "oklch(0.5 0.2 285 / 0.3)",
                    color: "oklch(0.7 0.15 285)",
                  }}
                  onClick={() => setBroadcastOpen(true)}
                  data-ocid="admin.broadcast_button"
                >
                  <Bell className="w-4 h-4" /> Post Announcement to Users
                </Button>
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  Quick Announcement
                </h3>
                <Input
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Message to all users..."
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  data-ocid="admin.textarea"
                />
                <Button
                  onClick={handleAnnouncement}
                  size="sm"
                  className="text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                  }}
                  data-ocid="admin.announce_button"
                >
                  Post Announcement
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---- SPOTS ---- */}
          {tab === "spots" && (
            <motion.div
              key="spots"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  Spot Management
                </h2>
                <Button
                  size="sm"
                  className="text-white h-8 text-xs"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                  }}
                  onClick={() => setAddSlotOpen(true)}
                  data-ocid="spots.add_button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={spotSearch}
                  onChange={(e) => setSpotSearch(e.target.value)}
                  placeholder="Search slot ID..."
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground text-xs"
                  data-ocid="spots.search"
                />
                <Select value={spotFloor} onValueChange={setSpotFloor}>
                  <SelectTrigger
                    className="bg-white/5 border-white/10 text-foreground w-28"
                    data-ocid="spots.floor_filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((f) => (
                      <SelectItem key={f} value={f}>
                        Floor {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {floors
                .filter((f) => spotFloor === "all" || f === spotFloor)
                .map((floor) => (
                  <div key={floor}>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      🏢 Floor {floor}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredSlots
                        .filter((s) => s.floor === floor)
                        .map((slot, i) => {
                          const s = slotStyle(slot.status);
                          return (
                            <div
                              key={slot.id}
                              className="rounded-xl overflow-hidden"
                              style={{
                                background: `${s.dot}18`,
                                border: `2px solid ${s.dot}44`,
                              }}
                            >
                              <button
                                type="button"
                                className="w-full p-3 flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setEditStatus(slot.status);
                                }}
                                data-ocid={`spots.item.${i + 1}`}
                              >
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                  style={{ background: s.dot }}
                                >
                                  {slot.id}
                                </div>
                                <span
                                  className="text-[9px] font-semibold tracking-wider"
                                  style={{ color: s.dot }}
                                >
                                  {s.label}
                                </span>
                                <span className="text-[8px] text-muted-foreground">
                                  Tap to edit
                                </span>
                              </button>
                              <button
                                type="button"
                                className="w-full text-[9px] text-red-400/60 hover:text-red-400 py-1 border-t border-white/5"
                                onClick={() => handleRemoveSlot(slot.id)}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </motion.div>
          )}

          {/* ---- BOOKINGS ---- */}
          {tab === "bookings" && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  All Bookings
                </h2>
                <Badge variant="secondary">
                  {activeBookings.length} active
                </Badge>
              </div>
              <Input
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search by name, car, token..."
                className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground text-xs"
                data-ocid="bookings.search"
              />
              {filteredBookings.length === 0 ? (
                <div
                  className="text-center py-16"
                  data-ocid="bookings.empty_state"
                >
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No bookings
                  </p>
                </div>
              ) : (
                reversedFilteredBookings.map((b, i) => (
                  <div
                    key={b.token}
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      background: b.cancelled
                        ? "oklch(0.13 0.03 250)"
                        : "oklch(0.15 0.035 245)",
                      border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      opacity: b.cancelled ? 0.6 : 1,
                    }}
                    data-ocid={`bookings.item.${i + 1}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Slot {b.slotId} — {b.userName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.carNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.bookedAt).toLocaleString()}
                        </div>
                      </div>
                      {b.cancelled ? (
                        <Badge variant="secondary" className="text-xs">
                          Cancelled
                        </Badge>
                      ) : (
                        <Badge
                          className="text-xs"
                          style={{
                            background: "#22c55e20",
                            color: "#22c55e",
                            border: "1px solid #22c55e30",
                          }}
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs text-blue-400 bg-black/20 rounded-lg px-3 py-2">
                      {b.token}
                    </div>
                    {!b.cancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        onClick={() => handleCancelBooking(b.token)}
                        data-ocid={`bookings.delete_button.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cancel
                      </Button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* ---- IOT ---- */}
          {tab === "iot" && (
            <motion.div
              key="iot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h2 className="font-display font-bold text-base text-foreground">
                IoT Panel
              </h2>

              {/* Connection status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: wsConnected ? "#22c55e20" : "#ef444420",
                    color: wsConnected ? "#22c55e" : "#ef4444",
                    border: `1px solid ${wsConnected ? "#22c55e33" : "#ef444433"}`,
                  }}
                >
                  {wsConnected ? "● Connected" : "○ Disconnected"}
                </span>
                {wsConnected && (
                  <span className="text-[10px] text-muted-foreground">
                    WebSocket active
                  </span>
                )}
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Device Configuration
                  </h3>
                </div>
                <Label className="text-xs text-muted-foreground">
                  ESP8266 IP Address
                </Label>
                <Input
                  value={deviceIp}
                  onChange={(e) => setDeviceIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="bg-white/5 border-white/10 text-foreground font-mono text-sm"
                  data-ocid="iot.input"
                />
                <p className="text-[11px] text-muted-foreground">
                  API endpoint:{" "}
                  <span className="text-blue-400 font-mono">
                    http://{deviceIp}/api/sensor
                  </span>
                </p>
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: `1px solid ${wsConnected ? "#22c55e44" : "oklch(0.28 0.04 245 / 40%)"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    WebSocket Live Stream
                  </h3>
                  {wsConnected && (
                    <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1.5 py-0.5">
                      CONNECTED
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={wsAddress}
                    onChange={(e) => setWsAddress(e.target.value)}
                    placeholder="ws://192.168.1.100/ws"
                    className="bg-white/5 border-white/10 text-foreground font-mono text-xs"
                  />
                  <Button
                    onClick={handleWsConnect}
                    size="sm"
                    className={
                      wsConnected
                        ? "bg-red-600 hover:bg-red-500 text-white"
                        : "bg-green-700 hover:bg-green-600 text-white"
                    }
                  >
                    {wsConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
                {wsLog.length > 0 && (
                  <div
                    className="rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto"
                    style={{ background: "oklch(0.1 0.03 250)" }}
                  >
                    {wsLog.map((l, i) => (
                      <div
                        key={`ws-${l.slice(0, 20)}-${i}`}
                        className="text-[10px] font-mono text-green-400"
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  Raw JSON Sensor Input
                </h3>
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={4}
                  placeholder={`[{"slotId":"A1","occupied":true},{"slotId":"B2","occupied":false}]`}
                  className="w-full rounded-lg p-3 text-xs font-mono text-green-400 bg-black/40 border border-white/10 resize-none focus:outline-none"
                />
                <Button
                  onClick={handleRawJson}
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-600 text-white w-full"
                  data-ocid="iot.apply_json_button"
                >
                  Apply to Slots
                </Button>
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Manual Sensor Test
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Slot ID
                    </Label>
                    <Select value={sensorSlot} onValueChange={setSensorSlot}>
                      <SelectTrigger
                        className="bg-white/5 border-white/10 text-foreground"
                        data-ocid="iot.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.slots.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={sensorOccupied ? "occupied" : "free"}
                      onValueChange={(v) => setSensorOccupied(v === "occupied")}
                    >
                      <SelectTrigger
                        className="bg-white/5 border-white/10 text-foreground"
                        data-ocid="iot.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                  }}
                  onClick={handleSensorTest}
                  disabled={iotLoading}
                  data-ocid="iot.primary_button"
                >
                  {iotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Sensor Update
                </Button>
              </div>

              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid #3b82f633",
                }}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Arduino Setup Guide
                  </h3>
                </div>
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  <p>
                    <span className="text-white font-medium">Hardware:</span>{" "}
                    Arduino UNO + ESP8266 ESP-01 + IR/Ultrasonic sensors
                  </p>
                  <p>
                    <span className="text-white font-medium">Libraries:</span>{" "}
                    ESP8266WiFi.h, ESP8266HTTPClient.h, ArduinoJson.h
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 font-mono text-[10px] text-green-400 overflow-x-auto"
                  style={{ background: "oklch(0.1 0.03 250)" }}
                >{`// Arduino sketch
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

void sendSensorData(String slotId, bool occupied) {
  HTTPClient http;
  http.begin("http://YOUR_SERVER/api/sensor");
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<128> doc;
  doc["slotId"] = slotId;
  doc["occupied"] = occupied;
  doc["apiKey"] = "SMARTPARK_HW_2024";
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
}`}</div>
              </div>

              {cmdLog.length > 0 && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "oklch(0.15 0.035 245)",
                    border: "1px solid oklch(0.28 0.04 245 / 40%)",
                  }}
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    Command Log
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cmdLog.map((entry, i) => (
                      <div
                        key={`${entry.time}-${i}`}
                        className="text-[10px] font-mono rounded-lg p-2"
                        style={{ background: "oklch(0.1 0.03 250)" }}
                      >
                        <span className="text-muted-foreground">
                          [{entry.time}]
                        </span>{" "}
                        <span className="text-blue-300">{entry.cmd}</span>{" "}
                        <span className="text-green-400">→ {entry.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  background: "#f59e0b18",
                  border: "1px solid #f59e0b33",
                }}
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-yellow-300 leading-relaxed">
                  For production, point ESP8266 to your backend URL. API key:{" "}
                  <span className="font-mono font-bold">SMARTPARK_HW_2024</span>
                  . All devices sync within 3 seconds.
                </p>
              </div>
            </motion.div>
          )}

          {/* ---- FLOORS ---- */}
          {tab === "floors" && (
            <motion.div
              key="floors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  Floor Control
                </h2>
                <Button
                  size="sm"
                  className="text-white h-8 text-xs"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                  }}
                  onClick={() => setAddFloorOpen(true)}
                  data-ocid="floors.add_button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Floor
                </Button>
              </div>
              {floors.map((f) => (
                <div
                  key={f}
                  className="rounded-xl p-4"
                  style={{
                    background: "oklch(0.15 0.035 245)",
                    border: "1px solid oklch(0.28 0.04 245 / 40%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        Floor {f}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {state.slots.filter((s) => s.floor === f).length} slots
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                      onClick={() => handleRemoveFloor(f)}
                      data-ocid={`floors.remove.${f}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ---- ANALYTICS ---- */}
          {tab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h2 className="font-display font-bold text-base text-foreground">
                Analytics
              </h2>

              {/* Big ring */}
              <div
                className="rounded-2xl p-6 flex flex-col items-center gap-4"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <OccupancyRing pct={occupancyPct} />
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Overall Occupancy Rate
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {occupied + booked} of {state.slots.length} spots used
                  </div>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(0.22 0.03 245)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${occupancyPct}%`,
                      background:
                        occupancyPct > 80
                          ? "#ef4444"
                          : occupancyPct > 50
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Total Bookings",
                    value: state.bookings.length,
                    color: "#8b5cf6",
                  },
                  {
                    label: "Active Now",
                    value: activeBookings.length,
                    color: "#22c55e",
                  },
                  {
                    label: "Cancelled",
                    value: state.bookings.filter((b) => b.cancelled).length,
                    color: "#ef4444",
                  },
                  {
                    label: "Est. Revenue",
                    value: `₹${activeBookings.length * state.hourlyRate * 2}`,
                    color: "#f59e0b",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3"
                    style={{
                      background: `${s.color}18`,
                      border: `1px solid ${s.color}33`,
                    }}
                  >
                    <div
                      className="text-xl font-bold"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                    <div className="text-xs" style={{ color: `${s.color}aa` }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Slot Status Breakdown
                </h3>
                {[
                  { label: "Free", count: free, color: "#22c55e" },
                  { label: "Occupied", count: occupied, color: "#ef4444" },
                  { label: "Booked", count: booked, color: "#3b82f6" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span style={{ color: item.color }}>
                        {state.slots.length > 0
                          ? Math.round((item.count / state.slots.length) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "oklch(0.22 0.03 245)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${state.slots.length > 0 ? (item.count / state.slots.length) * 100 : 0}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ---- RESERVATIONS ---- */}
          {tab === "reservations" && (
            <motion.div
              key="reservations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  Reservations
                </h2>
                <Badge variant="secondary">{state.bookings.length} total</Badge>
              </div>
              {state.bookings.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No reservations
                  </p>
                </div>
              ) : (
                reversedBookings.map((b, i) => (
                  <div
                    key={b.token}
                    className="rounded-xl p-4 space-y-2"
                    style={{
                      background: "oklch(0.15 0.035 245)",
                      border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      opacity: b.cancelled ? 0.6 : 1,
                    }}
                    data-ocid={`reservations.item.${i + 1}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Slot {b.slotId} — {b.userName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.carNumber} · ₹{b.hourlyRate}/hr
                        </div>
                      </div>
                      {b.cancelled ? (
                        <Badge variant="secondary">Cancelled</Badge>
                      ) : (
                        <Badge
                          style={{
                            background: "#22c55e20",
                            color: "#22c55e",
                            border: "1px solid #22c55e30",
                          }}
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs text-blue-400 bg-black/20 rounded px-2 py-1">
                      {b.token}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.bookedAt).toLocaleString()}
                    </div>
                    {!b.cancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        onClick={() => handleCancelBooking(b.token)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cancel
                      </Button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* ---- PAYMENTS ---- */}
          {tab === "payments" && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h2 className="font-display font-bold text-base text-foreground">
                Payments
              </h2>
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "#f59e0b18",
                  border: "1px solid #f59e0b33",
                }}
              >
                <CreditCard className="w-8 h-8 text-yellow-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Stripe Integration
                </h3>
                <p className="text-xs text-muted-foreground">
                  Connect your Stripe account to enable card payments. Configure
                  in Settings after connecting.
                </p>
                <Button
                  className="bg-yellow-600 hover:bg-yellow-500 text-white w-full"
                  data-ocid="payments.stripe_button"
                >
                  Set up Stripe
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Booking Payment Status
                </h3>
                {activeBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active bookings
                  </p>
                ) : (
                  activeBookings.map((b, i) => (
                    <div
                      key={b.token}
                      className="rounded-xl p-3 flex items-center justify-between"
                      style={{
                        background: "oklch(0.15 0.035 245)",
                        border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      }}
                      data-ocid={`payments.item.${i + 1}`}
                    >
                      <div>
                        <div className="text-xs font-medium text-foreground">
                          Slot {b.slotId} — {b.carNumber}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ₹{b.hourlyRate}/hr
                        </div>
                      </div>
                      <Badge
                        className="text-[10px]"
                        style={{
                          background: "#f59e0b20",
                          color: "#f59e0b",
                          border: "1px solid #f59e0b30",
                        }}
                      >
                        Pending
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ---- SETTINGS ---- */}
          {tab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h2 className="font-display font-bold text-base text-foreground">
                Settings
              </h2>
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  Hourly Rate
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    type="number"
                    className="bg-white/5 border-white/10 text-foreground"
                    placeholder="₹50"
                    data-ocid="settings.rate_input"
                  />
                  <Button
                    onClick={handleSaveRate}
                    className="text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                    }}
                    data-ocid="settings.save_button"
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: ₹{state.hourlyRate}/hr
                </p>
              </div>
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  Announcement
                </h3>
                <Input
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Post a message to all users..."
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  data-ocid="settings.announcement_input"
                />
                <Button
                  onClick={handleAnnouncement}
                  size="sm"
                  className="text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                  }}
                  data-ocid="settings.post_button"
                >
                  Post
                </Button>
              </div>
              {/* Demo Control Access */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  Demo Control Access
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Enable the Demo Control tab so admins can stage and test slot
                  changes.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">
                    Demo Tab Visible
                  </span>
                  <button
                    type="button"
                    onClick={() => setDemoAccessEnabled((v) => !v)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{
                      background: demoAccessEnabled
                        ? "#22c55e"
                        : "oklch(0.3 0.04 250)",
                    }}
                    data-ocid="settings.demo_access_toggle"
                  >
                    <span
                      className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                      style={{
                        transform: demoAccessEnabled
                          ? "translateX(22px)"
                          : "translateX(2px)",
                      }}
                    />
                  </button>
                </div>
                {demoAccessEnabled && (
                  <p className="text-[10px] text-green-400">
                    Demo Control tab is now accessible from the More menu.
                  </p>
                )}
              </div>

              {/* External Database */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <h3 className="text-sm font-semibold text-foreground">
                  External Database
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Connect SmartPark to an external database for persistent cloud
                  storage.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Database Type
                  </Label>
                  <Select value={extDbType} onValueChange={setExtDbType}>
                    <SelectTrigger
                      className="bg-white/5 border-white/10 text-foreground text-xs"
                      data-ocid="settings.extdb_type_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firebase">
                        Firebase Realtime DB / Firestore
                      </SelectItem>
                      <SelectItem value="mongodb">MongoDB Atlas</SelectItem>
                      <SelectItem value="supabase">Supabase</SelectItem>
                      <SelectItem value="custom">Custom REST API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Connection URL
                  </Label>
                  <Input
                    value={extDbUrl}
                    onChange={(e) => setExtDbUrl(e.target.value)}
                    placeholder={
                      extDbType === "firebase"
                        ? "https://your-project.firebaseio.com"
                        : extDbType === "supabase"
                          ? "https://xyz.supabase.co"
                          : "https://api.example.com"
                    }
                    className="bg-white/5 border-white/10 text-foreground font-mono text-xs"
                    data-ocid="settings.extdb_url_input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    API Key / Secret
                  </Label>
                  <Input
                    value={extDbKey}
                    onChange={(e) => setExtDbKey(e.target.value)}
                    type="password"
                    placeholder="Paste your API key or secret here"
                    className="bg-white/5 border-white/10 text-foreground font-mono text-xs"
                    data-ocid="settings.extdb_key_input"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    className="text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
                    }}
                    disabled={!extDbUrl || extDbStatus === "testing"}
                    onClick={() => {
                      if (!extDbUrl) return;
                      setExtDbStatus("testing");
                      setTimeout(() => {
                        setExtDbStatus(
                          extDbUrl.startsWith("http") ? "ok" : "error",
                        );
                      }, 1500);
                    }}
                    data-ocid="settings.extdb_test_button"
                  >
                    {extDbStatus === "testing"
                      ? "Testing..."
                      : "Test Connection"}
                  </Button>
                  {extDbStatus === "ok" && (
                    <span className="text-xs text-green-400 font-semibold">
                      ✓ Connected
                    </span>
                  )}
                  {extDbStatus === "error" && (
                    <span className="text-xs text-red-400 font-semibold">
                      ✗ Failed — check URL
                    </span>
                  )}
                </div>
                {extDbStatus === "ok" && (
                  <div
                    className="rounded-lg p-3 text-[10px] font-mono text-green-300 whitespace-pre-wrap"
                    style={{ background: "oklch(0.1 0.03 250)" }}
                  >
                    {extDbType === "firebase" &&
                      `// Firebase config
const app = initializeApp({ databaseURL: "${extDbUrl}", apiKey: "..." });
const db = getDatabase(app);`}
                    {extDbType === "mongodb" &&
                      `// MongoDB connection
MongoClient.connect("${extDbUrl}");`}
                    {extDbType === "supabase" &&
                      `// Supabase client
const supabase = createClient("${extDbUrl}", apiKey);`}
                    {extDbType === "custom" &&
                      `// Custom REST
fetch("${extDbUrl}/slots") // GET all slots
fetch("${extDbUrl}/slots/A1", { method: "PATCH" }) // update`}
                  </div>
                )}
              </div>

              <div
                className="rounded-xl p-3 text-xs text-muted-foreground"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                SmartPark Live v22.0 · Real-time sync every 3s · ICP powered
              </div>
            </motion.div>
          )}

          {/* ---- DEMO CONTROL ---- */}
          {tab === "demo" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">
                  Demo Control
                </h2>
                <button
                  type="button"
                  onClick={toggleDemoMode}
                  className="text-xs font-bold rounded-xl px-3 py-1.5 transition-colors"
                  style={
                    state.demoMode
                      ? {
                          background:
                            "linear-gradient(135deg, #f97316, #ea580c)",
                          color: "white",
                        }
                      : {
                          background: "oklch(0.22 0.04 250)",
                          color: "#9ca3af",
                          border: "1px solid oklch(0.28 0.04 245 / 40%)",
                        }
                  }
                  data-ocid="demo.toggle_button"
                >
                  {state.demoMode ? "🟠 DEMO ON" : "DEMO OFF"}
                </button>
              </div>

              {/* Color legend */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                {(
                  [
                    ["#22c55e", "Free"],
                    ["#ef4444", "Occupied"],
                    ["#3b82f6", "Booked"],
                    ["#6b7280", "Unknown"],
                  ] as [string, string][]
                ).map(([c, l]) => (
                  <span
                    key={l}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      background: `${c}20`,
                      color: c,
                      border: `1px solid ${c}30`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: c }}
                    />
                    {l}
                  </span>
                ))}
              </div>

              {/* Status info */}
              <div
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  background: state.demoMode ? "#f9731618" : "#3b82f618",
                  border: `1px solid ${state.demoMode ? "#f9731633" : "#3b82f633"}`,
                }}
              >
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${state.demoMode ? "text-orange-400" : "text-blue-400"}`}
                />
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: state.demoMode ? "#fdba74" : "#93c5fd" }}
                >
                  {state.demoMode
                    ? "Demo Mode is ON. Slot changes apply immediately to all devices."
                    : "Demo Mode is OFF. Click slots to stage changes, then click Apply All to push them live."}
                </p>
              </div>

              {/* Apply/Clear staged */}
              {Object.keys(staged).length > 0 && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white"
                    onClick={applyStaged}
                    data-ocid="demo.apply_button"
                  >
                    Apply All Staged ({Object.keys(staged).length})
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10 text-foreground hover:bg-white/5"
                    onClick={() => setStaged({})}
                    data-ocid="demo.clear_button"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {/* Slot grid - memoized via demoSlotGrid */}
              {demoSlotGrid}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav — purple theme */}
      <nav className="app-bottom-nav">
        {MAIN_TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className="app-bottom-nav-item relative"
              onClick={() => setTab(item.id)}
              data-ocid="admin.tab"
            >
              {isActive && <span className="nav-pill-admin" />}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className="app-bottom-nav-item relative"
          onClick={() => setMoreOpen(true)}
          data-ocid="admin.more_button"
        >
          {visibleMoreTabs.some((t) => t.id === tab) && (
            <span className="nav-pill-admin" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </div>
        </button>
      </nav>

      {/* More Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-white/10"
          style={{ background: "oklch(0.13 0.04 250)" }}
        >
          <SheetHeader>
            <SheetTitle className="text-foreground font-display text-base">
              More Options
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pt-4 pb-safe">
            {visibleMoreTabs.map((item) => (
              <button
                type="button"
                key={item.id}
                className="rounded-2xl p-4 flex flex-col gap-2 text-left hover:bg-white/5 transition-colors"
                style={{
                  background:
                    tab === item.id
                      ? "oklch(0.5 0.2 285 / 0.2)"
                      : "oklch(0.17 0.04 250)",
                  border:
                    tab === item.id
                      ? "1px solid oklch(0.5 0.2 285 / 0.4)"
                      : "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
                onClick={() => {
                  setTab(item.id);
                  setMoreOpen(false);
                }}
                data-ocid={`more.${item.id}`}
              >
                <item.icon
                  className="w-5 h-5"
                  style={{ color: "oklch(0.7 0.15 285)" }}
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="broadcast.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Bell
                className="w-5 h-5"
                style={{ color: "oklch(0.7 0.15 285)" }}
              />
              Broadcast to All Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              rows={3}
              placeholder="e.g. Parking lot will be closed at 10 PM tonight..."
              className="w-full rounded-xl p-3 text-sm bg-black/30 border border-white/10 text-foreground outline-none resize-none focus:border-purple-500"
              data-ocid="broadcast.textarea"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-foreground hover:bg-white/5"
              onClick={() => setBroadcastOpen(false)}
              data-ocid="broadcast.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
              }}
              onClick={handleBroadcast}
              data-ocid="broadcast.confirm_button"
            >
              📢 Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot Override Modal */}
      <Dialog
        open={!!selectedSlot}
        onOpenChange={(o) => !o && setSelectedSlot(null)}
      >
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="slots.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Override Slot {selectedSlot?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Set Status
              </Label>
              <div className="grid grid-cols-2 gap-2" data-ocid="slots.select">
                {(
                  ["free", "occupied", "booked", "unknown"] as SlotStatus[]
                ).map((st) => {
                  const labels: Record<SlotStatus, string> = {
                    free: "🟢 Free",
                    occupied: "🔴 Occupied",
                    booked: "🔵 Booked",
                    unknown: "⚫ Unknown",
                  };
                  const colors: Record<SlotStatus, string> = {
                    free: "oklch(0.55 0.18 145 / 0.25)",
                    occupied: "oklch(0.55 0.2 25 / 0.25)",
                    booked: "oklch(0.5 0.18 240 / 0.25)",
                    unknown: "oklch(0.4 0.01 240 / 0.25)",
                  };
                  const borders: Record<SlotStatus, string> = {
                    free: "oklch(0.55 0.18 145 / 0.7)",
                    occupied: "oklch(0.55 0.2 25 / 0.7)",
                    booked: "oklch(0.5 0.18 240 / 0.7)",
                    unknown: "oklch(0.4 0.01 240 / 0.5)",
                  };
                  const isSelected = editStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className="rounded-xl py-2.5 px-3 text-sm font-medium text-foreground transition-all"
                      style={{
                        background: isSelected
                          ? colors[st]
                          : "oklch(0.18 0.03 245)",
                        border: isSelected
                          ? `2px solid ${borders[st]}`
                          : "2px solid oklch(0.28 0.04 245 / 40%)",
                        outline: "none",
                      }}
                    >
                      {labels[st]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-foreground hover:bg-white/5"
              onClick={() => setSelectedSlot(null)}
              data-ocid="slots.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
              }}
              onClick={handleOverride}
              data-ocid="slots.confirm_button"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Slot Modal */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="add_slot.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Slot ID</Label>
              <Input
                value={newSlotId}
                onChange={(e) => setNewSlotId(e.target.value)}
                placeholder="e.g. C1"
                className="bg-white/5 border-white/10 text-foreground"
                data-ocid="add_slot.id_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Floor</Label>
              <Select value={newSlotFloor} onValueChange={setNewSlotFloor}>
                <SelectTrigger
                  className="bg-white/5 border-white/10 text-foreground"
                  data-ocid="add_slot.floor_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((f) => (
                    <SelectItem key={f} value={f}>
                      Floor {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-foreground hover:bg-white/5"
              onClick={() => setAddSlotOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
              }}
              onClick={handleAddSlot}
              data-ocid="add_slot.confirm_button"
            >
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Floor Modal */}
      <Dialog open={addFloorOpen} onOpenChange={setAddFloorOpen}>
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="add_floor.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Floor</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Floor Name (letter or number)
            </Label>
            <Input
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              placeholder="e.g. C"
              className="bg-white/5 border-white/10 text-foreground"
              data-ocid="add_floor.name_input"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-foreground hover:bg-white/5"
              onClick={() => setAddFloorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.5 0.2 285), oklch(0.4 0.22 270))",
              }}
              onClick={handleAddFloor}
              data-ocid="add_floor.confirm_button"
            >
              Add Floor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demo slot edit modal */}
      <Dialog open={!!demoSlot} onOpenChange={(o) => !o && setDemoSlot(null)}>
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="demo.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Stage Change: Slot {demoSlot}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">New Status</Label>
            <Select
              value={demoEditStatus}
              onValueChange={(v) => setDemoEditStatus(v as SlotStatus)}
            >
              <SelectTrigger
                className="bg-white/5 border-white/10 text-foreground"
                data-ocid="demo.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">🟢 Free</SelectItem>
                <SelectItem value="occupied">🔴 Occupied</SelectItem>
                <SelectItem value="booked">🔵 Booked</SelectItem>
                <SelectItem value="unknown">⚫ Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-foreground hover:bg-white/5"
              onClick={() => setDemoSlot(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 text-white"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
              }}
              onClick={() => {
                if (!demoSlot) return;
                const slot = demoSlot;
                const status = demoEditStatus;
                const isLive = state.demoMode;
                setDemoSlot(null);
                try {
                  if (isLive) {
                    adminOverrideSlot(slot, status);
                    setState(loadState());
                    toast.success(`Slot ${slot} → ${status}`);
                  } else {
                    setStaged((prev) => ({
                      ...prev,
                      [slot]: status,
                    }));
                    toast.success(`Staged: Slot ${slot} → ${status}`);
                  }
                } catch {
                  toast.error("Failed to apply change");
                }
              }}
              data-ocid="demo.confirm_button"
            >
              {state.demoMode ? "Apply Now" : "Stage Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Unused icon references kept for clarity
const _unused = { CheckCircle2, Circle };
void _unused;
