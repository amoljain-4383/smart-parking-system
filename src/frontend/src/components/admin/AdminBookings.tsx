import { useEffect, useState } from "react";
import {
  type Booking,
  type ParkingState,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import ReceiptModal from "../ReceiptModal";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function AdminBookings() {
  const [state, setState] = useState<ParkingState | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
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

  const filtered = state.bookings
    .filter((b) => filter === "all" || b.paymentStatus === filter)
    .filter(
      (b) =>
        !search ||
        b.carNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.userName.toLowerCase().includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cash: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search by name or car number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No bookings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 border-b font-medium text-gray-600">ID</th>
                <th className="p-3 border-b font-medium text-gray-600">User</th>
                <th className="p-3 border-b font-medium text-gray-600">
                  Car No.
                </th>
                <th className="p-3 border-b font-medium text-gray-600">Spot</th>
                <th className="p-3 border-b font-medium text-gray-600">
                  Start
                </th>
                <th className="p-3 border-b font-medium text-gray-600">End</th>
                <th className="p-3 border-b font-medium text-gray-600">
                  Amount
                </th>
                <th className="p-3 border-b font-medium text-gray-600">
                  Status
                </th>
                <th className="p-3 border-b font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 border-b">
                  <td className="p-3 font-mono text-xs">{b.id}</td>
                  <td className="p-3">{b.userName}</td>
                  <td className="p-3 font-mono text-xs">{b.carNumber}</td>
                  <td className="p-3">
                    {b.spotNumber}
                    {state.isMultiFloor ? ` (${b.floorName})` : ""}
                  </td>
                  <td className="p-3 text-xs">
                    {new Date(b.startTime).toLocaleString()}
                  </td>
                  <td className="p-3 text-xs">
                    {new Date(b.endTime).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold">₹{b.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.paymentStatus] ?? ""}`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {b.paymentStatus !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markCashPaid(b.id)}
                          className="text-xs"
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReceipt(b)}
                        className="text-xs"
                      >
                        Receipt
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {receipt && (
        <ReceiptModal booking={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}
