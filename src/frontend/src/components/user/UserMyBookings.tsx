import { useEffect, useState } from "react";
import type { Session } from "../../App";
import { type Booking, getParkingState } from "../../lib/parkingStore";
import ReceiptModal from "../ReceiptModal";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface Props {
  session: Session;
}

export default function UserMyBookings({ session }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [receipt, setReceipt] = useState<Booking | null>(null);

  useEffect(() => {
    const state = getParkingState();
    const myBookings = state.bookings
      .filter((b) => b.carNumber === session.carNumber)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    setBookings(myBookings);
  }, [session.carNumber]);

  const getStatusLabel = (b: Booking) => {
    const now = new Date();
    if (new Date(b.endTime) < now)
      return { label: "Expired", className: "bg-gray-100 text-gray-600" };
    if (b.paymentStatus === "paid")
      return { label: "Paid", className: "bg-green-100 text-green-700" };
    if (b.paymentStatus === "cash")
      return {
        label: "Cash Pending",
        className: "bg-yellow-100 text-yellow-700",
      };
    return { label: "Pending", className: "bg-blue-100 text-blue-700" };
  };

  return (
    <div className="space-y-4">
      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500">
          No bookings found for car number {session.carNumber}.
        </p>
      ) : (
        bookings.map((b) => {
          const s = getStatusLabel(b);
          const durMs =
            new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
          const dur = `${Math.floor(durMs / 3600000)}h ${Math.floor((durMs % 3600000) / 60000)}m`;
          return (
            <div
              key={b.id}
              className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-gray-800">
                  Spot {b.spotNumber} {b.floorName ? `— ${b.floorName}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(b.startTime).toLocaleString()} →{" "}
                  {new Date(b.endTime).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Duration: {dur} · ₹{b.amount}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${s.className}`}
                >
                  {s.label}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReceipt(b)}
                >
                  Receipt
                </Button>
              </div>
            </div>
          );
        })
      )}
      {receipt && (
        <ReceiptModal booking={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}
