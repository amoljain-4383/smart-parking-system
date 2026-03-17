import { useEffect, useState } from "react";
import type { Session } from "../../App";
import {
  type Booking,
  type ParkingSpot,
  type ParkingState,
  generateId,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import ReceiptModal from "../ReceiptModal";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Props {
  session: Session;
}

const statusColors: Record<string, string> = {
  available:
    "bg-green-100 text-green-700 border-green-200 cursor-pointer hover:bg-green-200",
  occupied:
    "bg-red-100 text-red-400 border-red-200 cursor-not-allowed opacity-60",
  reserved:
    "bg-yellow-100 text-yellow-600 border-yellow-200 cursor-not-allowed opacity-60",
  maintenance:
    "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
};

export default function UserBookSpot({ session }: Props) {
  const [state, setState] = useState<ParkingState | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "online">("cash");
  const [error, setError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

  useEffect(() => {
    const s = getParkingState();
    setState(s);
    setSelectedFloor(s.floors[0]?.id ?? "");
  }, []);

  if (!state) return null;

  const floors = state.isMultiFloor ? state.floors : state.floors.slice(0, 1);
  const spots = state.spots.filter((s) => s.floorId === selectedFloor);
  const currentFloor = floors.find((f) => f.id === selectedFloor);

  const calcFee = () => {
    if (!startTime || !endTime) return 0;
    const diff =
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000;
    return Math.max(0, Math.ceil(diff * state.hourlyRate));
  };

  const confirmBooking = () => {
    setError("");
    if (!selectedSpot) {
      setError("Please select a spot.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please enter start and end times.");
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    if (start.getTime() - now.getTime() < 30 * 60 * 1000) {
      setError("Booking must be at least 30 minutes in advance.");
      return;
    }
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }
    const amount = calcFee();
    const booking: Booking = {
      id: generateId(),
      carNumber: session.carNumber ?? "",
      userName: session.name ?? "",
      floorId: selectedFloor,
      floorName: currentFloor?.name ?? "Ground Floor",
      spotId: selectedSpot.id,
      spotNumber: selectedSpot.spotNumber,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      amount,
      paymentStatus: payMethod === "cash" ? "cash" : "pending",
      paymentMethod: payMethod,
      createdAt: new Date().toISOString(),
    };
    const updatedSpots = state.spots.map((s) =>
      s.id === selectedSpot.id ? { ...s, status: "reserved" as const } : s,
    );
    const updated = {
      ...state,
      bookings: [...state.bookings, booking],
      spots: updatedSpots,
    };
    saveParkingState(updated);
    setState(updated);
    setSelectedSpot(null);
    setStartTime("");
    setEndTime("");
    setConfirmedBooking(booking);
  };

  const fee = calcFee();

  return (
    <div className="space-y-4">
      {state.isMultiFloor && floors.length > 1 && (
        <div>
          <Label>Select Floor</Label>
          <Select value={selectedFloor} onValueChange={setSelectedFloor}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Select an available (green) spot:
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
          {spots.map((spot) => (
            <button
              type="button"
              key={spot.id}
              disabled={spot.status !== "available"}
              onClick={() =>
                setSelectedSpot(selectedSpot?.id === spot.id ? null : spot)
              }
              className={`h-12 rounded-lg border text-xs font-bold transition-all ${statusColors[spot.status]} ${
                selectedSpot?.id === spot.id
                  ? "ring-2 ring-blue-500 ring-offset-1"
                  : ""
              }`}
            >
              {spot.spotNumber}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded-full" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-full" />
            Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-400 rounded-full" />
            Reserved
          </span>
        </div>
      </div>
      {selectedSpot && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="font-semibold text-gray-800">
              Booking Spot{" "}
              <span className="text-blue-600">{selectedSpot.spotNumber}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            {fee > 0 && (
              <p className="text-sm font-semibold text-blue-700">
                Estimated Fee: &#x20b9;{fee}
              </p>
            )}
            <div>
              <Label>Payment Method</Label>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("cash")}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${payMethod === "cash" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"}`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("online")}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${payMethod === "online" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"}`}
                >
                  Online (Stripe)
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              type="button"
              onClick={confirmBooking}
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              Confirm Booking
            </Button>
          </CardContent>
        </Card>
      )}
      {confirmedBooking && (
        <ReceiptModal
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
        />
      )}
    </div>
  );
}
