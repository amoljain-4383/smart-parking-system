import { useEffect, useState } from "react";
import {
  type Booking,
  type ParkingState,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import ReceiptModal from "../ReceiptModal";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function AdminPayments() {
  const [state, setState] = useState<ParkingState | null>(null);
  const [receipt, setReceipt] = useState<Booking | null>(null);

  useEffect(() => {
    setState(getParkingState());
  }, []);
  if (!state) return null;

  const markCashPaid = (id: string) => {
    const updated = {
      ...state,
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, paymentStatus: "paid" as const } : b,
      ),
    };
    saveParkingState(updated);
    setState(updated);
  };

  const today = new Date().toDateString();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const paidBookings = state.bookings.filter((b) => b.paymentStatus === "paid");
  const todayRev = paidBookings
    .filter((b) => new Date(b.createdAt).toDateString() === today)
    .reduce((s, b) => s + b.amount, 0);
  const weekRev = paidBookings
    .filter((b) => new Date(b.createdAt) >= startOfWeek)
    .reduce((s, b) => s + b.amount, 0);
  const monthRev = paidBookings
    .filter((b) => new Date(b.createdAt) >= startOfMonth)
    .reduce((s, b) => s + b.amount, 0);
  const onlineRev = paidBookings
    .filter((b) => b.paymentMethod === "online")
    .reduce((s, b) => s + b.amount, 0);
  const cashRev = paidBookings
    .filter((b) => b.paymentMethod === "cash")
    .reduce((s, b) => s + b.amount, 0);

  const pending = state.bookings.filter(
    (b) => b.paymentStatus === "cash" || b.paymentStatus === "pending",
  );

  const summaryStats = [
    {
      label: "Today's Revenue",
      value: `\u20b9${todayRev}`,
      color: "text-blue-600",
    },
    { label: "This Week", value: `\u20b9${weekRev}`, color: "text-green-600" },
    {
      label: "This Month",
      value: `\u20b9${monthRev}`,
      color: "text-purple-600",
    },
    {
      label: "Online Payments",
      value: `\u20b9${onlineRev}`,
      color: "text-blue-500",
    },
    {
      label: "Cash Payments",
      value: `\u20b9${cashRev}`,
      color: "text-amber-600",
    },
    { label: "Pending", value: pending.length, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {summaryStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {b.userName} — {b.carNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      Spot {b.spotNumber} · &#x20b9;{b.amount} ·{" "}
                      {b.paymentMethod}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markCashPaid(b.id)}
                    >
                      Mark Paid
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReceipt(b)}
                    >
                      Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {receipt && (
        <ReceiptModal booking={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}
