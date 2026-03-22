import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellOff,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Grid3X3,
  HelpCircle,
  List,
  Loader2,
  LogOut,
  Pencil,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "../App";
import {
  type Booking,
  type ParkingSlot,
  type ParkingState,
  bookSlot,
  cancelBooking,
  loadState,
  subscribeToSync,
} from "../lib/parkingStore";

type Tab = "parking" | "bookings" | "favorites" | "notifications" | "profile";
type SlotView = "grid" | "list";
type BookingStep = 1 | 2 | 3 | 4;

function slotStyle(status: ParkingSlot["status"]) {
  switch (status) {
    case "free":
      return {
        bg: "#22c55e18",
        border: "#22c55e55",
        dot: "#22c55e",
        label: "Free",
        textColor: "#22c55e",
      };
    case "occupied":
      return {
        bg: "#ef444418",
        border: "#ef444455",
        dot: "#ef4444",
        label: "Occupied",
        textColor: "#ef4444",
      };
    case "booked":
      return {
        bg: "#3b82f618",
        border: "#3b82f655",
        dot: "#3b82f6",
        label: "Booked",
        textColor: "#3b82f6",
      };
    default:
      return {
        bg: "#37415118",
        border: "#37415155",
        dot: "#6b7280",
        label: "No Data",
        textColor: "#6b7280",
      };
  }
}

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

const FAQ_ITEMS = [
  {
    q: "What do slot colors mean?",
    a: "Green = Free (available to book), Red = Occupied (sensor detected vehicle), Blue = Booked (reserved by user), Gray = No sensor data yet.",
  },
  {
    q: "How do I book a slot?",
    a: "Tap any green (Free) slot on the Parking tab, then follow the booking wizard. You'll receive a unique token.",
  },
  {
    q: "Can two users book the same slot?",
    a: "No — SmartPark uses atomic locking. If two users tap the same free slot simultaneously, only one booking succeeds.",
  },
  {
    q: "How do I cancel my booking?",
    a: "Go to My Bookings tab and tap the Cancel button next to your booking.",
  },
  {
    q: "How does Arduino send data to the app?",
    a: 'The ESP8266 sends a POST request to /api/sensor with JSON: {"slotId":"A1","occupied":true,"apiKey":"SMARTPARK_HW_2024"}.',
  },
  {
    q: "What is the hourly rate?",
    a: "Default rate is ₹50/hr. The admin can change this in Settings.",
  },
  {
    q: "What are Favorites?",
    a: "Star any parking slot to save it to your Favorites list. Quickly see its status and book directly from the Favorites tab.",
  },
];

const VEHICLE_TYPES = [
  { id: "Car", icon: Car, label: "Car" },
  { id: "Bike", icon: Sparkles, label: "Bike" },
  { id: "Truck", icon: Truck, label: "Truck" },
];

function StepIndicator({ step }: { step: BookingStep }) {
  const steps = ["Spot", "Duration", "Review", "Done"];
  return (
    <div className="flex items-center justify-center gap-0 mb-2">
      {steps.map((label, i) => {
        const num = (i + 1) as BookingStep;
        const isActive = step === num;
        const isDone = step > num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: isDone
                    ? "#22c55e"
                    : isActive
                      ? "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))"
                      : "oklch(0.22 0.03 245)",
                  color: isDone || isActive ? "white" : "#6b7280",
                  border: isActive ? "2px solid oklch(0.65 0.18 195)" : "none",
                }}
              >
                {isDone ? "✓" : num}
              </div>
              <span
                className="text-[9px] font-medium"
                style={{
                  color: isActive
                    ? "oklch(0.75 0.15 195)"
                    : isDone
                      ? "#22c55e"
                      : "#6b7280",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-6 h-0.5 mx-1 mb-4 transition-all duration-300"
                style={{
                  background:
                    step > num ? "#22c55e" : "oklch(0.28 0.04 245 / 50%)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserDashboard({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("parking");
  const [slotView, setSlotView] = useState<SlotView>("grid");
  const [state, setState] = useState<ParkingState>(loadState);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [bookingStep, setBookingStep] = useState<BookingStep>(1);
  const [bookingDuration, setBookingDuration] = useState(2);
  const [bookingVehicle, setBookingVehicle] = useState("Car");
  const [bookingNote, setBookingNote] = useState("");
  const [booking, setBooking] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [estimatorHours, setEstimatorHours] = useState(2);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editingCar, setEditingCar] = useState(false);
  const [carNumberDraft, setCarNumberDraft] = useState(session.carNumber ?? "");
  const [localCarNumber, setLocalCarNumber] = useState(session.carNumber ?? "");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("parkingFavorites") || "[]",
      ) as string[];
    } catch {
      return [];
    }
  });
  const [vehicles, setVehicles] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("parkingVehicles") || "null",
      ) as string[] | null;
      return stored ?? (session.carNumber ? [session.carNumber] : []);
    } catch {
      return session.carNumber ? [session.carNumber] : [];
    }
  });
  const [newVehicle, setNewVehicle] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

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

  const myBookings = useMemo(
    () =>
      state.bookings.filter(
        (b) => b.carNumber === session.carNumber && !b.cancelled,
      ),
    [state.bookings, session.carNumber],
  );
  const allMyBookings = useMemo(
    () => state.bookings.filter((b) => b.carNumber === session.carNumber),
    [state.bookings, session.carNumber],
  );

  const toggleFavorite = useCallback((slotId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId];
      localStorage.setItem("parkingFavorites", JSON.stringify(next));
      return next;
    });
  }, []);

  const openBookingDialog = useCallback((slot: ParkingSlot) => {
    setSelectedSlot(slot);
    setBookingStep(1);
    setBookingDuration(2);
    setBookingVehicle("Car");
    setBookingNote("");
  }, []);

  const handleConfirmBook = useCallback(() => {
    if (!selectedSlot) return;
    setBooking(true);
    setTimeout(() => {
      const result = bookSlot(
        selectedSlot.id,
        session.carNumber!,
        session.name!,
      );
      setBooking(false);
      if (result.success) {
        setState(loadState());
        setBookingStep(4);
        setSuccessToken(result.token);
        toast.success(`Slot ${selectedSlot.id} booked! 🎉`);
      } else {
        toast.error(result.error);
        setSelectedSlot(null);
      }
    }, 700);
  }, [selectedSlot, session.carNumber, session.name]);

  const handleSurpriseMe = useCallback(() => {
    const freeSlots = state.slots.filter((s) => s.status === "free");
    if (freeSlots.length === 0) {
      toast.error("No free slots available");
      return;
    }
    const random = freeSlots[Math.floor(Math.random() * freeSlots.length)];
    openBookingDialog(random);
    toast.success(
      `✨ Surprise! Slot ${random.id} (Floor ${random.floor}) selected`,
    );
  }, [state.slots, openBookingDialog]);

  const handleCancel = useCallback((token: string) => {
    const result = cancelBooking(token);
    if (result.success) {
      setState(loadState());
      toast.success("Booking cancelled");
    } else toast.error(result.error);
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported on this device");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    setNotificationsEnabled(permission === "granted");
    if (permission === "granted") toast.success("Notifications enabled!");
    else toast.error("Notification permission denied");
  }, []);

  const handleSaveCarNumber = useCallback(() => {
    setLocalCarNumber(carNumberDraft);
    setEditingCar(false);
    toast.success("Car number updated");
  }, [carNumberDraft]);

  const handleAddVehicle = useCallback(() => {
    if (!newVehicle.trim()) return;
    const updated = [...vehicles, newVehicle.trim().toUpperCase()];
    setVehicles(updated);
    localStorage.setItem("parkingVehicles", JSON.stringify(updated));
    setNewVehicle("");
    setAddingVehicle(false);
    toast.success("Vehicle added");
  }, [newVehicle, vehicles]);

  const handleRemoveVehicle = useCallback(
    (v: string) => {
      const updated = vehicles.filter((x) => x !== v);
      setVehicles(updated);
      localStorage.setItem("parkingVehicles", JSON.stringify(updated));
    },
    [vehicles],
  );

  const totalSpending = useMemo(
    () => allMyBookings.reduce((acc, b) => acc + b.hourlyRate * 2, 0),
    [allMyBookings],
  );
  const totalHours = useMemo(() => allMyBookings.length * 2, [allMyBookings]);
  const floors = useMemo(
    () => [...new Set(state.slots.map((s) => s.floor))],
    [state.slots],
  );

  const slotsByFloor = useMemo(() => {
    const map: Record<string, typeof state.slots> = {};
    for (const s of state.slots) {
      if (!map[s.floor]) map[s.floor] = [];
      map[s.floor].push(s);
    }
    return map;
  }, [state.slots]);

  const NAV_ITEMS = useMemo(
    () =>
      [
        { id: "parking" as Tab, icon: Car, label: "Parking" },
        {
          id: "bookings" as Tab,
          icon: CalendarDays,
          label: "Bookings",
          badge: myBookings.length,
        },
        {
          id: "favorites" as Tab,
          icon: Star,
          label: "Favorites",
          badge: favorites.length,
        },
        {
          id: "notifications" as Tab,
          icon: Bell,
          label: "Alerts",
          badge: state.adminAnnouncement ? 1 : 0,
        },
        { id: "profile" as Tab, icon: User, label: "Profile" },
      ] as Array<{
        id: Tab;
        icon: React.ElementType;
        label: string;
        badge?: number;
      }>,
    [myBookings.length, favorites.length, state.adminAnnouncement],
  );

  const estimatedCost = useMemo(
    () => bookingDuration * state.hourlyRate,
    [bookingDuration, state.hourlyRate],
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
                "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
            }}
          >
            <Car className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-sm">
              Smart<span style={{ color: "oklch(0.7 0.18 195)" }}>Park</span>
            </span>
            <div className="flex items-center gap-1">
              <PulsingDot />
              <span className="text-[9px] text-muted-foreground">
                Live · {lastSync.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
            }}
          >
            {(session.name ?? "U")[0].toUpperCase()}
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-foreground">
              {session.name}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {localCarNumber || session.carNumber}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onLogout}
            data-ocid="user.button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Announcement */}
      {state.adminAnnouncement && (
        <div className="px-4 py-2 text-xs text-center bg-yellow-500/10 text-yellow-400 border-b border-yellow-500/20">
          📢 {state.adminAnnouncement}
        </div>
      )}

      <main className="app-content">
        <AnimatePresence mode="wait">
          {/* ---- PARKING TAB ---- */}
          {tab === "parking" && (
            <motion.div
              key="parking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Enhanced Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Free",
                    count: state.slots.filter((s) => s.status === "free")
                      .length,
                    color: "#22c55e",
                    gradient: "from-green-500/20 to-green-500/5",
                  },
                  {
                    label: "Occupied",
                    count: state.slots.filter((s) => s.status === "occupied")
                      .length,
                    color: "#ef4444",
                    gradient: "from-red-500/20 to-red-500/5",
                  },
                  {
                    label: "Booked",
                    count: state.slots.filter((s) => s.status === "booked")
                      .length,
                    color: "#3b82f6",
                    gradient: "from-blue-500/20 to-blue-500/5",
                  },
                ].map((st) => (
                  <div
                    key={st.label}
                    className="rounded-xl p-3 text-center relative overflow-hidden"
                    style={{
                      background: `${st.color}18`,
                      border: `1px solid ${st.color}33`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${st.color}30, transparent 70%)`,
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
                      style={{ color: `${st.color}cc` }}
                    >
                      {st.label}
                    </div>
                    <div
                      className="mt-1.5 h-1 rounded-full overflow-hidden"
                      style={{ background: `${st.color}20` }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:
                            state.slots.length > 0
                              ? `${(st.count / state.slots.length) * 100}%`
                              : "0%",
                          background: st.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Surprise Me */}
              <Button
                className="w-full text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                }}
                onClick={handleSurpriseMe}
                data-ocid="parking.surprise_button"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Surprise Me! — Pick a
                random spot
              </Button>

              {/* Cost Estimator */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    💰 Cost Estimator
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.72 0.18 60)" }}
                  >
                    ₹{estimatorHours * state.hourlyRate}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={estimatorHours}
                  onChange={(e) => setEstimatorHours(Number(e.target.value))}
                  className="w-full h-1.5"
                  style={{ accentColor: "oklch(0.55 0.18 195)" }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1 hr</span>
                  <span>
                    {estimatorHours} hr{estimatorHours > 1 ? "s" : ""} × ₹
                    {state.hourlyRate}/hr
                  </span>
                  <span>12 hrs</span>
                </div>
              </div>

              {/* View toggle + title */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Parking Slots
                </span>
                <div
                  className="flex items-center rounded-lg overflow-hidden"
                  style={{ border: "1px solid oklch(0.28 0.04 245 / 40%)" }}
                >
                  <button
                    type="button"
                    onClick={() => setSlotView("grid")}
                    className="p-1.5 transition-colors"
                    style={
                      slotView === "grid"
                        ? { background: "oklch(0.55 0.18 195)", color: "white" }
                        : { color: "#6b7280" }
                    }
                    data-ocid="parking.toggle"
                    title="Grid view"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotView("list")}
                    className="p-1.5 transition-colors"
                    style={
                      slotView === "list"
                        ? { background: "oklch(0.55 0.18 195)", color: "white" }
                        : { color: "#6b7280" }
                    }
                    data-ocid="parking.toggle"
                    title="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Floors */}
              {floors.map((floor, fi) => (
                <div key={floor}>
                  {fi > 0 && slotView === "grid" && (
                    <div className="relative mb-4">
                      <div className="border-t-2 border-dashed border-white/10" />
                      <div className="absolute inset-x-0 -top-3 flex justify-center">
                        <span className="text-[9px] bg-card px-2 text-muted-foreground">
                          ↕ LANE ↕
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    🏢 Floor {floor}
                    {slotView === "grid" ? " — Tap a free slot to book" : ""}
                  </div>
                  {slotView === "grid" ? (
                    <div className="grid grid-cols-3 gap-2">
                      {(slotsByFloor[floor] ?? []).map((slot) => {
                        const s = slotStyle(slot.status);
                        const canBook = slot.status === "free";
                        const isFav = favorites.includes(slot.id);
                        return (
                          <div
                            key={slot.id}
                            className="relative rounded-xl transition-all duration-300"
                            style={{
                              background: s.bg,
                              border: `2px solid ${s.border}`,
                              boxShadow: canBook
                                ? `0 0 12px ${s.dot}33`
                                : "none",
                              minHeight: "80px",
                              opacity: slot.status === "occupied" ? 0.5 : 1,
                            }}
                          >
                            <button
                              type="button"
                              className={`w-full h-full p-3 flex flex-col items-center gap-1 ${canBook ? "hover:scale-105 cursor-pointer" : "cursor-not-allowed"} transition-transform duration-200`}
                              onClick={() => canBook && openBookingDialog(slot)}
                              data-ocid={`parking.item.${slot.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`}
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
                              {slot.lastUpdated && (
                                <span className="text-[8px] text-muted-foreground">
                                  {new Date(
                                    slot.lastUpdated,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </button>
                            {/* Star button */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 p-0.5 rounded transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(slot.id);
                              }}
                              style={{ color: isFav ? "#f59e0b" : "#6b7280" }}
                              title={
                                isFav
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                            >
                              <Star
                                className="w-3 h-3"
                                fill={isFav ? "#f59e0b" : "none"}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(slotsByFloor[floor] ?? []).map((slot) => {
                        const s = slotStyle(slot.status);
                        const canBook = slot.status === "free";
                        const isFav = favorites.includes(slot.id);
                        return (
                          <div
                            key={slot.id}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                            style={{
                              background: s.bg,
                              border: `1px solid ${s.border}`,
                              opacity: slot.status === "occupied" ? 0.6 : 1,
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: s.dot }}
                            >
                              {slot.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-foreground">
                                Slot {slot.id}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Floor {slot.floor}
                                {slot.lastUpdated
                                  ? ` · ${new Date(slot.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                  : ""}
                              </div>
                            </div>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${s.dot}22`,
                                color: s.dot,
                              }}
                            >
                              {s.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(slot.id)}
                              style={{ color: isFav ? "#f59e0b" : "#6b7280" }}
                            >
                              <Star
                                className="w-4 h-4"
                                fill={isFav ? "#f59e0b" : "none"}
                              />
                            </button>
                            {canBook && (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] px-2.5 text-white"
                                style={{
                                  background:
                                    "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                                }}
                                onClick={() => openBookingDialog(slot)}
                                data-ocid={`parking.item.${slot.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`}
                              >
                                Book
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                {(
                  [
                    ["#22c55e", "Free"],
                    ["#ef4444", "Occupied"],
                    ["#3b82f6", "Booked"],
                    ["#6b7280", "No Data"],
                  ] as [string, string][]
                ).map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: c }}
                    />
                    {l}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ---- BOOKINGS TAB ---- */}
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
                <h2 className="font-display font-semibold text-base text-foreground">
                  My Bookings
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {myBookings.length} active
                </Badge>
              </div>
              {allMyBookings.length === 0 ? (
                <div
                  className="text-center py-16 space-y-3"
                  data-ocid="bookings.empty_state"
                >
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No bookings yet
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTab("parking")}
                    className="text-xs"
                  >
                    Browse slots
                  </Button>
                </div>
              ) : (
                allMyBookings.map((b, i) => (
                  <BookingCard
                    key={b.token}
                    booking={b}
                    index={i + 1}
                    onCancel={() => handleCancel(b.token)}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* ---- FAVORITES TAB ---- */}
          {tab === "favorites" && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-base text-foreground">
                  ⭐ Favorites
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {favorites.length} saved
                </Badge>
              </div>
              {favorites.length === 0 ? (
                <div
                  className="text-center py-16 space-y-3"
                  data-ocid="favorites.empty_state"
                >
                  <Star className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No favorites yet
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Tap ⭐ on any slot to save it here
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTab("parking")}
                    className="text-xs"
                  >
                    Browse slots
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((slotId, i) => {
                    const slot = state.slots.find((s) => s.id === slotId);
                    const s = slot
                      ? slotStyle(slot.status)
                      : slotStyle("unknown");
                    const canBook = slot?.status === "free";
                    return (
                      <div
                        key={slotId}
                        className="flex items-center gap-3 rounded-xl px-3 py-3"
                        style={{
                          background: slot ? s.bg : "oklch(0.15 0.035 245)",
                          border: `1px solid ${slot ? s.border : "oklch(0.28 0.04 245 / 40%)"}`,
                        }}
                        data-ocid={`favorites.item.${i + 1}`}
                      >
                        <Star
                          className="w-4 h-4 flex-shrink-0"
                          fill="#f59e0b"
                          style={{ color: "#f59e0b" }}
                        />
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: slot ? s.dot : "#6b7280" }}
                        >
                          {slotId}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground">
                            Slot {slotId}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {slot ? `Floor ${slot.floor}` : "Slot not found"}
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${slot ? s.dot : "#6b7280"}22`,
                            color: slot ? s.dot : "#6b7280",
                          }}
                        >
                          {slot ? s.label : "N/A"}
                        </span>
                        <div className="flex items-center gap-1">
                          {canBook && slot && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] px-2 text-white"
                              style={{
                                background:
                                  "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                              }}
                              onClick={() => openBookingDialog(slot)}
                              data-ocid={`favorites.book_button.${i + 1}`}
                            >
                              Book
                            </Button>
                          )}
                          <button
                            type="button"
                            className="p-1 text-red-400/60 hover:text-red-400"
                            onClick={() => toggleFavorite(slotId)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ---- NOTIFICATIONS TAB ---- */}
          {tab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-base text-foreground">
                  Notifications
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {state.adminAnnouncement ? "1 new" : "All read"}
                </Badge>
              </div>

              <div
                className="rounded-xl p-3 flex items-center justify-between gap-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4 text-blue-400" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-xs font-semibold text-foreground">
                      Push Notifications
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {notifPermission === "granted"
                        ? "Enabled — slot updates will notify you"
                        : notifPermission === "denied"
                          ? "Blocked — check browser settings"
                          : "Get alerts for free slots and parking full"}
                    </p>
                  </div>
                </div>
                {notifPermission !== "denied" && (
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) handleEnableNotifications();
                      else setNotificationsEnabled(false);
                    }}
                    data-ocid="notifications.switch"
                  />
                )}
                {notifPermission === "denied" && (
                  <span className="text-[10px] text-red-400">Blocked</span>
                )}
              </div>

              {state.adminAnnouncement && (
                <div
                  className="rounded-xl p-3 space-y-1"
                  style={{
                    background: "#f59e0b18",
                    border: "1px solid #f59e0b33",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📢</span>
                    <span className="text-xs font-semibold text-yellow-400">
                      Admin Announcement
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {state.adminAnnouncement}
                  </p>
                </div>
              )}

              {allMyBookings.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Booking Activity
                  </h3>
                  {allMyBookings.slice(0, 5).map((b) => (
                    <div
                      key={b.token}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        background: "oklch(0.15 0.035 245)",
                        border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      }}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${b.cancelled ? "bg-red-400" : "bg-green-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {b.cancelled ? "Cancelled" : "Booked"} Slot {b.slotId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(b.bookedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-blue-400">
                        {b.token}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="text-center py-12 space-y-3"
                  data-ocid="notifications.empty_state"
                >
                  <Bell className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No new notifications
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Booking confirmations and alerts will appear here.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ---- PROFILE TAB ---- */}
          {tab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <h2 className="font-display font-semibold text-base text-foreground">
                My Profile
              </h2>

              {/* Avatar card */}
              <div
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.18 195 / 0.15), oklch(0.35 0.15 285 / 0.1))",
                  border: "1px solid oklch(0.55 0.18 195 / 0.3)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                  }}
                >
                  {(session.name ?? "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-bold text-base text-foreground">
                    {session.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {localCarNumber || session.carNumber}
                  </div>
                  <Badge
                    className="mt-1 text-[10px]"
                    style={{
                      background: "oklch(0.55 0.18 195 / 0.2)",
                      color: "oklch(0.75 0.15 195)",
                      border: "1px solid oklch(0.55 0.18 195 / 0.3)",
                    }}
                  >
                    Active Driver
                  </Badge>
                </div>
              </div>

              {/* Parking Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Bookings",
                    value: allMyBookings.length,
                    color: "#818cf8",
                  },
                  { label: "Est. Hours", value: totalHours, color: "#22c55e" },
                  {
                    label: "Est. Spent",
                    value: `₹${totalSpending}`,
                    color: "#f59e0b",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{
                      background: `${stat.color}15`,
                      border: `1px solid ${stat.color}30`,
                    }}
                  >
                    <div
                      className="text-lg font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vehicles */}
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    🚗 My Vehicles
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-white/10 text-foreground hover:bg-white/5 gap-1"
                    onClick={() => setAddingVehicle(true)}
                    data-ocid="profile.button"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {vehicles.map((v) => (
                  <div
                    key={v}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "oklch(0.12 0.04 245)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono text-foreground">
                        {v}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-red-400/60 hover:text-red-400"
                      onClick={() => handleRemoveVehicle(v)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No vehicles added
                  </p>
                )}
                {addingVehicle && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newVehicle}
                      onChange={(e) =>
                        setNewVehicle(e.target.value.toUpperCase())
                      }
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-black/30 border border-white/10 text-foreground outline-none"
                      placeholder="Enter plate number"
                      onKeyDown={(e) => e.key === "Enter" && handleAddVehicle()}
                      data-ocid="profile.input"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs text-white"
                      style={{ background: "oklch(0.55 0.18 195)" }}
                      onClick={handleAddVehicle}
                      data-ocid="profile.save_button"
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setAddingVehicle(false)}
                      data-ocid="profile.cancel_button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Edit car number */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{
                  background: "oklch(0.15 0.035 245)",
                  border: "1px solid oklch(0.28 0.04 245 / 40%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Primary Car Number
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {localCarNumber || session.carNumber}
                    </p>
                  </div>
                  {!editingCar && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-white/10 text-foreground hover:bg-white/5 gap-1"
                      onClick={() => {
                        setCarNumberDraft(
                          localCarNumber || session.carNumber || "",
                        );
                        setEditingCar(true);
                      }}
                      data-ocid="profile.edit_button"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  )}
                </div>
                {editingCar && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={carNumberDraft}
                      onChange={(e) => setCarNumberDraft(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveCarNumber()
                      }
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-black/30 border border-white/10 text-foreground outline-none focus:border-blue-500"
                      placeholder="Enter car number"
                      data-ocid="profile.input"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs text-white"
                      style={{ background: "oklch(0.55 0.18 195)" }}
                      onClick={handleSaveCarNumber}
                      data-ocid="profile.save_button"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setEditingCar(false)}
                      data-ocid="profile.cancel_button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Booking history */}
              {allMyBookings.length > 0 && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: "oklch(0.15 0.035 245)",
                    border: "1px solid oklch(0.28 0.04 245 / 40%)",
                  }}
                >
                  <span className="text-xs font-semibold text-foreground">
                    📋 Booking History
                  </span>
                  {allMyBookings.slice(0, 5).map((b) => (
                    <div
                      key={b.token}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.cancelled ? "bg-red-400" : "bg-green-400"}`}
                      />
                      <span className="text-foreground">Slot {b.slotId}</span>
                      <span className="text-muted-foreground flex-1">
                        {new Date(b.bookedAt).toLocaleDateString()}
                      </span>
                      <span style={{ color: "#f59e0b" }}>
                        ₹{b.hourlyRate * 2}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Help accordion */}
              <div
                className="rounded-xl overflow-hidden space-y-0"
                style={{ border: "1px solid oklch(0.28 0.04 245 / 40%)" }}
              >
                <div
                  className="px-4 py-3"
                  style={{ background: "oklch(0.15 0.035 245)" }}
                >
                  <span className="text-xs font-semibold text-foreground">
                    ❓ Help & FAQ
                  </span>
                </div>
                {FAQ_ITEMS.map((item, i) => (
                  <div
                    key={item.q}
                    style={{
                      background: "oklch(0.13 0.04 245)",
                      borderTop: "1px solid oklch(0.28 0.04 245 / 30%)",
                    }}
                  >
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 flex items-center justify-between text-left"
                      onClick={() =>
                        setExpandedFaq(expandedFaq === i ? null : i)
                      }
                      data-ocid={`help.toggle.${i + 1}`}
                    >
                      <span className="text-xs font-medium text-foreground pr-2">
                        {item.q}
                      </span>
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    </button>
                    <AnimatePresence>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 text-[11px] text-muted-foreground leading-relaxed border-t border-white/5 pt-2">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Logout */}
              <Button
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                onClick={onLogout}
                data-ocid="profile.delete_button"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav — colorful with icons */}
      <nav className="app-bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className="app-bottom-nav-item relative"
              onClick={() => setTab(item.id)}
              data-ocid="user.tab"
            >
              {isActive && <span className="nav-pill-user" />}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                      style={{
                        background:
                          item.id === "favorites" ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium truncate max-w-[52px]">
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Multi-Step Booking Dialog */}
      <Dialog
        open={!!selectedSlot && bookingStep !== 4}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedSlot(null);
            setBookingStep(1);
          }
        }}
      >
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="booking.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground text-base">
              Book Parking Spot
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <>
              <StepIndicator step={bookingStep} />

              <AnimatePresence mode="wait">
                {/* Step 1 — Spot Details */}
                {bookingStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div
                      className="rounded-xl p-4 text-center space-y-2"
                      style={{
                        background: "#22c55e18",
                        border: "1px solid #22c55e44",
                        boxShadow: "0 0 20px #22c55e33",
                      }}
                    >
                      <div className="text-4xl font-display font-black text-green-400">
                        {selectedSlot.id}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span>🏢 Floor {selectedSlot.floor}</span>
                        <span>·</span>
                        <span>🚗 {"Car"}</span>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
                        style={{
                          background: "#22c55e22",
                          color: "#22c55e",
                          border: "1px solid #22c55e44",
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Available
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="text-foreground font-medium">
                          ₹{state.hourlyRate}/hr
                        </span>
                      </div>
                      {selectedSlot.lastUpdated && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last updated
                          </span>
                          <span className="text-foreground">
                            {new Date(
                              selectedSlot.lastUpdated,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full text-white font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                      }}
                      onClick={() => setBookingStep(2)}
                      data-ocid="booking.primary_button"
                    >
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2 — Duration & Vehicle */}
                {bookingStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Duration */}
                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{
                        background: "oklch(0.12 0.04 245)",
                        border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          ⏱️ Duration
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "oklch(0.72 0.18 60)" }}
                        >
                          {bookingDuration} hr{bookingDuration > 1 ? "s" : ""} —
                          ₹{estimatedCost}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={bookingDuration}
                        onChange={(e) =>
                          setBookingDuration(Number(e.target.value))
                        }
                        className="w-full h-1.5"
                        style={{ accentColor: "oklch(0.55 0.18 195)" }}
                        data-ocid="booking.toggle"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1 hr</span>
                        <span>12 hrs</span>
                      </div>
                    </div>

                    {/* Vehicle Type */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        🚗 Vehicle Type
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {VEHICLE_TYPES.map((vt) => (
                          <button
                            type="button"
                            key={vt.id}
                            onClick={() => setBookingVehicle(vt.id)}
                            className="rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all"
                            style={{
                              background:
                                bookingVehicle === vt.id
                                  ? "oklch(0.55 0.18 195 / 0.2)"
                                  : "oklch(0.12 0.04 245)",
                              border:
                                bookingVehicle === vt.id
                                  ? "2px solid oklch(0.55 0.18 195 / 0.6)"
                                  : "2px solid oklch(0.28 0.04 245 / 40%)",
                            }}
                          >
                            <vt.icon
                              className="w-4 h-4"
                              style={{
                                color:
                                  bookingVehicle === vt.id
                                    ? "oklch(0.7 0.15 195)"
                                    : "#6b7280",
                              }}
                            />
                            <span
                              className="text-[10px]"
                              style={{
                                color:
                                  bookingVehicle === vt.id
                                    ? "oklch(0.7 0.15 195)"
                                    : "#6b7280",
                              }}
                            >
                              {vt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Car number */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        🔢 Car Number
                      </span>
                      <div
                        className="rounded-lg px-3 py-2 text-sm font-mono text-foreground"
                        style={{
                          background: "oklch(0.12 0.04 245)",
                          border: "1px solid oklch(0.28 0.04 245 / 40%)",
                        }}
                      >
                        {localCarNumber || session.carNumber}
                      </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        📝 Note (optional)
                      </span>
                      <textarea
                        value={bookingNote}
                        onChange={(e) => setBookingNote(e.target.value)}
                        rows={2}
                        placeholder="e.g. Black SUV, near entrance"
                        className="w-full rounded-lg px-3 py-2 text-xs bg-black/30 border border-white/10 text-foreground outline-none resize-none focus:border-blue-500"
                        data-ocid="booking.textarea"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/10 text-foreground hover:bg-white/5"
                        onClick={() => setBookingStep(1)}
                        data-ocid="booking.cancel_button"
                      >
                        ← Back
                      </Button>
                      <Button
                        className="flex-1 text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                        }}
                        onClick={() => setBookingStep(3)}
                        data-ocid="booking.primary_button"
                      >
                        Continue →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 — Review */}
                {bookingStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{
                        background: "oklch(0.12 0.04 245)",
                        border: "1px solid oklch(0.28 0.04 245 / 40%)",
                      }}
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Booking Summary
                      </h3>
                      {[
                        ["Slot", selectedSlot.id],
                        ["Floor", `Floor ${selectedSlot.floor}`],
                        [
                          "Duration",
                          `${bookingDuration} hour${bookingDuration > 1 ? "s" : ""}`,
                        ],
                        ["Vehicle", bookingVehicle],
                        ["Car Number", localCarNumber || session.carNumber],
                        ["Rate", `₹${state.hourlyRate}/hr`],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-muted-foreground">{label}</span>
                          <span className="text-foreground font-medium">
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-foreground">
                            Total Cost
                          </span>
                          <span
                            className="text-xl font-display font-black"
                            style={{ color: "oklch(0.72 0.18 60)" }}
                          >
                            ₹{estimatedCost}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/10 text-foreground hover:bg-white/5"
                        onClick={() => setBookingStep(2)}
                        data-ocid="booking.cancel_button"
                      >
                        ← Back
                      </Button>
                      <Button
                        className="flex-1 text-white font-semibold"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                        }}
                        onClick={handleConfirmBook}
                        disabled={booking}
                        data-ocid="booking.confirm_button"
                      >
                        {booking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "✓ Confirm Booking"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Step 4 — Success Dialog */}
      <Dialog
        open={bookingStep === 4 && !!successToken}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedSlot(null);
            setBookingStep(1);
            setSuccessToken(null);
          }
        }}
      >
        <DialogContent
          className="rounded-2xl max-w-[340px]"
          style={{
            background: "oklch(0.15 0.035 245)",
            border: "1px solid oklch(0.28 0.04 245 / 60%)",
          }}
          data-ocid="success.dialog"
        >
          <div className="text-center space-y-4 py-2">
            {/* Confetti bits */}
            <div className="relative">
              {["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"].map(
                (color, i) => (
                  <span
                    key={color}
                    className="animate-confetti-fall absolute text-lg"
                    style={{
                      color,
                      left: `${15 + i * 15}%`,
                      top: "-10px",
                      animationDuration: `${1.2 + i * 0.2}s`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    🎉
                  </span>
                ),
              )}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: "#22c55e20",
                  border: "2px solid #22c55e44",
                }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">
                Slot Booked! 🎉
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your parking token
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.1 0.03 250)",
                border: "1px solid #22c55e44",
              }}
            >
              <div className="flex items-center gap-2 justify-center">
                <Ticket className="w-4 h-4 text-green-400" />
                <span className="font-mono font-bold text-green-400 text-lg">
                  {successToken}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this token. Use My Bookings to cancel.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-foreground hover:bg-white/5 text-xs"
                onClick={() => {
                  setSelectedSlot(null);
                  setBookingStep(1);
                  setSuccessToken(null);
                  setTab("bookings");
                }}
                data-ocid="success.secondary_button"
              >
                View Bookings
              </Button>
              <Button
                className="flex-1 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.18 195), oklch(0.45 0.2 220))",
                }}
                onClick={() => {
                  setSelectedSlot(null);
                  setBookingStep(1);
                  setSuccessToken(null);
                }}
                data-ocid="success.close_button"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Plus } from "lucide-react";

const BookingCard = memo(function BookingCard({
  booking,
  index,
  onCancel,
}: { booking: Booking; index: number; onCancel: () => void }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: booking.cancelled
          ? "oklch(0.13 0.03 250)"
          : "oklch(0.15 0.035 245)",
        border: booking.cancelled
          ? "1px solid oklch(0.28 0.04 245 / 20%)"
          : "1px solid oklch(0.28 0.04 245 / 50%)",
        opacity: booking.cancelled ? 0.6 : 1,
      }}
      data-ocid={`bookings.item.${index}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Slot {booking.slotId}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(booking.bookedAt).toLocaleString()}
          </div>
        </div>
        {booking.cancelled ? (
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
      <div className="flex items-center gap-2 font-mono text-xs bg-black/20 rounded-lg px-3 py-2">
        <Ticket className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-blue-400">{booking.token}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>₹{booking.hourlyRate}/hr</span>
        <span>{booking.carNumber}</span>
      </div>
      {!booking.cancelled && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
          onClick={onCancel}
          data-ocid={`bookings.delete_button.${index}`}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cancel Booking
        </Button>
      )}
    </div>
  );
});
