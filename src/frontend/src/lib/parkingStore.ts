// ============================================================
// SmartPark — Centralized State Store
// Uses ICP canister as the cloud DB (cross-device sync)
// + BroadcastChannel for instant same-browser tab sync.
// All devices poll the canister every 3 seconds.
// ============================================================

import { createActorWithConfig } from "../config";

export type SlotStatus = "free" | "occupied" | "booked" | "unknown";

export interface ParkingSlot {
  id: string;
  floor: string;
  status: SlotStatus;
  lastUpdated: string;
  bookedBy?: string;
  bookingToken?: string;
}

export interface Booking {
  token: string;
  slotId: string;
  carNumber: string;
  userName: string;
  bookedAt: string;
  cancelledAt?: string;
  cancelled: boolean;
  hourlyRate: number;
}

export interface ParkingState {
  slots: ParkingSlot[];
  bookings: Booking[];
  hourlyRate: number;
  lastSyncAt: string;
  version: number; // monotonic counter — highest wins
  adminAnnouncement?: string;
  demoMode: boolean;
}

const LOCAL_KEY = "smartpark_state_v3";
const CHANNEL_NAME = "smartpark_sync_v3";
const SYNC_INTERVAL_MS = 3000;

let channel: BroadcastChannel | null = null;
let actorPromise: Promise<{
  getSharedState(): Promise<string>;
  setSharedState(s: string): Promise<void>;
}> | null = null;
let syncListeners: Array<(state: ParkingState) => void> = [];
let syncTimer: ReturnType<typeof setInterval> | null = null;
let pushQueue: ParkingState | null = null;
let isPushing = false;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function getActor(): Promise<{
  getSharedState(): Promise<string>;
  setSharedState(s: string): Promise<void>;
}> {
  if (!actorPromise) {
    actorPromise = createActorWithConfig() as unknown as Promise<{
      getSharedState(): Promise<string>;
      setSharedState(s: string): Promise<void>;
    }>;
  }
  return actorPromise;
}

function defaultSlots(): ParkingSlot[] {
  const now = new Date().toISOString();
  const slots: ParkingSlot[] = [];
  for (let i = 1; i <= 6; i++)
    slots.push({
      id: `A${i}`,
      floor: "A",
      status: "unknown",
      lastUpdated: now,
    });
  for (let i = 1; i <= 6; i++)
    slots.push({
      id: `B${i}`,
      floor: "B",
      status: "unknown",
      lastUpdated: now,
    });
  return slots;
}

function defaultState(): ParkingState {
  return {
    slots: defaultSlots(),
    bookings: [],
    hourlyRate: 50,
    lastSyncAt: new Date().toISOString(),
    version: 0,
    demoMode: false,
  };
}

export function loadState(): ParkingState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ParkingState;
      if (!parsed.version) parsed.version = 0;
      const existingIds = new Set(parsed.slots.map((s) => s.id));
      for (const ds of defaultSlots()) {
        if (!existingIds.has(ds.id)) parsed.slots.push(ds);
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return defaultState();
}

function saveLocal(state: ParkingState): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

function broadcast(state: ParkingState): void {
  try {
    const ch = getChannel();
    if (ch) ch.postMessage({ type: "STATE_UPDATE", payload: state });
  } catch {
    /* ignore */
  }
}

function notifyListeners(state: ParkingState): void {
  for (const fn of syncListeners) {
    try {
      fn(state);
    } catch {
      /* ignore */
    }
  }
}

// Drain push queue — always pushes the latest queued state
async function drainPushQueue(): Promise<void> {
  if (isPushing || !pushQueue) return;
  const state = pushQueue;
  pushQueue = null;
  isPushing = true;
  try {
    const a = await getActor();
    await a.setSharedState(JSON.stringify(state));
  } catch {
    // On failure, re-queue so next poll attempt retries
    if (!pushQueue) pushQueue = state;
  } finally {
    isPushing = false;
    if (pushQueue) {
      // More items arrived while we were pushing
      void drainPushQueue();
    }
  }
}

// Pull latest state from canister and apply if it has a higher version
export async function pullFromCanister(): Promise<ParkingState | null> {
  try {
    const a = await getActor();
    const raw = await a.getSharedState();
    if (!raw || raw.trim() === "") return null;
    const remote = JSON.parse(raw) as ParkingState;
    if (!remote.version) remote.version = 0;
    const local = loadState();
    // Remote wins if version is strictly higher
    if (remote.version > (local.version ?? 0)) {
      // Merge: keep any slots defined locally that remote doesn't know about
      const remoteIds = new Set(remote.slots.map((s) => s.id));
      const extraLocal = local.slots.filter((s) => !remoteIds.has(s.id));
      const merged: ParkingState = {
        ...remote,
        slots: [...remote.slots, ...extraLocal],
      };
      saveLocal(merged);
      broadcast(merged);
      notifyListeners(merged);
      return merged;
    }
    return local;
  } catch {
    return null;
  }
}

export function saveState(state: ParkingState): void {
  const updated: ParkingState = {
    ...state,
    version: (state.version ?? 0) + 1,
    lastSyncAt: new Date().toISOString(),
  };
  saveLocal(updated);
  broadcast(updated);
  notifyListeners(updated);
  // Queue push — always keeps the newest state in queue
  pushQueue = updated;
  void drainPushQueue();
}

export function subscribeToSync(
  callback: (state: ParkingState) => void,
): () => void {
  syncListeners.push(callback);

  const ch = getChannel();
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "STATE_UPDATE")
      callback(e.data.payload as ParkingState);
  };
  if (ch) ch.addEventListener("message", handler);

  // Start polling canister if not already running
  if (!syncTimer) {
    // Initial pull immediately
    void pullFromCanister();
    syncTimer = setInterval(() => {
      void pullFromCanister();
    }, SYNC_INTERVAL_MS);
  }

  return () => {
    syncListeners = syncListeners.filter((fn) => fn !== callback);
    if (ch) ch.removeEventListener("message", handler);
    if (syncListeners.length === 0 && syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}

// ---- Atomic booking ----
export function bookSlot(
  slotId: string,
  carNumber: string,
  userName: string,
): { success: true; token: string } | { success: false; error: string } {
  const state = loadState();
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return { success: false, error: "Slot not found" };
  if (slot.status !== "free")
    return {
      success: false,
      error: "Slot just got taken — please pick another",
    };
  const token = `TKN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  slot.status = "booked";
  slot.lastUpdated = now;
  slot.bookedBy = carNumber;
  slot.bookingToken = token;
  state.bookings.push({
    token,
    slotId,
    carNumber,
    userName,
    bookedAt: now,
    cancelled: false,
    hourlyRate: state.hourlyRate,
  });
  saveState(state);
  return { success: true, token };
}

export function cancelBooking(
  token: string,
): { success: true } | { success: false; error: string } {
  const state = loadState();
  const booking = state.bookings.find((b) => b.token === token && !b.cancelled);
  if (!booking) return { success: false, error: "Booking not found" };
  booking.cancelled = true;
  booking.cancelledAt = new Date().toISOString();
  const slot = state.slots.find((s) => s.id === booking.slotId);
  if (slot && slot.status === "booked" && slot.bookingToken === token) {
    slot.status = "free";
    slot.lastUpdated = new Date().toISOString();
    slot.bookedBy = undefined;
    slot.bookingToken = undefined;
  }
  saveState(state);
  return { success: true };
}

export function adminOverrideSlot(slotId: string, status: SlotStatus): void {
  const state = loadState();
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return;
  if (slot.status === "booked" && slot.bookingToken && status !== "booked") {
    const booking = state.bookings.find(
      (b) => b.token === slot.bookingToken && !b.cancelled,
    );
    if (booking) {
      booking.cancelled = true;
      booking.cancelledAt = new Date().toISOString();
    }
  }
  slot.status = status;
  slot.lastUpdated = new Date().toISOString();
  if (status !== "booked") {
    slot.bookedBy = undefined;
    slot.bookingToken = undefined;
  }
  saveState(state);
}

export function sensorUpdate(slotId: string, occupied: boolean): void {
  const state = loadState();
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return;
  if (slot.status === "booked") return;
  slot.status = occupied ? "occupied" : "free";
  slot.lastUpdated = new Date().toISOString();
  saveState(state);
}

export function adminResetAll(): void {
  const state = loadState();
  const now = new Date().toISOString();
  for (const slot of state.slots) {
    if (slot.status === "booked" && slot.bookingToken) {
      const b = state.bookings.find(
        (bk) => bk.token === slot.bookingToken && !bk.cancelled,
      );
      if (b) {
        b.cancelled = true;
        b.cancelledAt = now;
      }
    }
    slot.status = "free";
    slot.lastUpdated = now;
    slot.bookedBy = undefined;
    slot.bookingToken = undefined;
  }
  saveState(state);
}

export function setHourlyRate(rate: number): void {
  const state = loadState();
  state.hourlyRate = rate;
  saveState(state);
}

export function setAdminAnnouncement(msg: string): void {
  const state = loadState();
  state.adminAnnouncement = msg;
  saveState(state);
}
