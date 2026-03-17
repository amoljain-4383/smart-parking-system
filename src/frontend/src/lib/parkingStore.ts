export type SpotStatus = "available" | "occupied" | "reserved" | "maintenance";
export type PaymentStatus = "pending" | "paid" | "cash";
export type PaymentMethod = "online" | "cash";

export interface Floor {
  id: string;
  name: string;
  spotCount: number;
}

export interface ParkingSpot {
  id: string;
  floorId: string;
  spotNumber: string;
  status: SpotStatus;
}

export interface Booking {
  id: string;
  carNumber: string;
  userName: string;
  floorId: string;
  floorName: string;
  spotId: string;
  spotNumber: string;
  startTime: string;
  endTime: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Notification {
  id: string;
  carNumber: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ParkingState {
  isMultiFloor: boolean;
  floors: Floor[];
  spots: ParkingSpot[];
  bookings: Booking[];
  notifications: Notification[];
  hourlyRate: number;
  adminPassword: string;
}

const KEY = "parkingState";

function generateSpots(
  floorId: string,
  count: number,
  prefix: string,
): ParkingSpot[] {
  const spots: ParkingSpot[] = [];
  for (let i = 1; i <= count; i++) {
    spots.push({
      id: `${floorId}-spot-${i}`,
      floorId,
      spotNumber: `${prefix}${i}`,
      status: "available",
    });
  }
  return spots;
}

export function initializeParkingState() {
  if (localStorage.getItem(KEY)) return;
  const floor1: Floor = { id: "floor-1", name: "Ground Floor", spotCount: 20 };
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const sampleBooking: Booking = {
    id: "BK001",
    carNumber: "MH12AB1234",
    userName: "Raj Kumar",
    floorId: "floor-1",
    floorName: "Ground Floor",
    spotId: "floor-1-spot-3",
    spotNumber: "A3",
    startTime: soon.toISOString(),
    endTime: later.toISOString(),
    amount: 100,
    paymentStatus: "paid",
    paymentMethod: "cash",
    createdAt: now.toISOString(),
  };
  const spots = generateSpots("floor-1", 20, "A");
  spots[2].status = "reserved";
  const state: ParkingState = {
    isMultiFloor: false,
    floors: [floor1],
    spots,
    bookings: [sampleBooking],
    notifications: [],
    hourlyRate: 50,
    adminPassword: "admin123",
  };
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getParkingState(): ParkingState {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    initializeParkingState();
    return getParkingState();
  }
  return JSON.parse(raw) as ParkingState;
}

export function saveParkingState(state: ParkingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function generateId(): string {
  return `BK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
