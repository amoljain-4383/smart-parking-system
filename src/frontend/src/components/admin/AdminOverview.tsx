import { useEffect, useState } from "react";
import { type ParkingState, getParkingState } from "../../lib/parkingStore";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

export default function AdminOverview() {
  const [state, setState] = useState<ParkingState | null>(null);

  useEffect(() => {
    setState(getParkingState());
  }, []);
  if (!state) return null;

  const total = state.spots.length;
  const available = state.spots.filter((s) => s.status === "available").length;
  const occupied = state.spots.filter((s) => s.status === "occupied").length;
  const reserved = state.spots.filter((s) => s.status === "reserved").length;
  const maintenance = state.spots.filter(
    (s) => s.status === "maintenance",
  ).length;
  const occupancy =
    total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;
  const today = new Date().toDateString();
  const todayRevenue = state.bookings
    .filter(
      (b) =>
        new Date(b.createdAt).toDateString() === today &&
        b.paymentStatus === "paid",
    )
    .reduce((sum, b) => sum + b.amount, 0);

  const stats = [
    { label: "Total Spots", value: total, color: "text-gray-800" },
    { label: "Available", value: available, color: "text-green-600" },
    { label: "Occupied", value: occupied, color: "text-red-600" },
    { label: "Reserved", value: reserved, color: "text-yellow-600" },
    { label: "Maintenance", value: maintenance, color: "text-gray-500" },
    {
      label: "Today's Revenue",
      value: `\u20b9${todayRevenue}`,
      color: "text-blue-600",
    },
  ];

  const recent = [...state.bookings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Occupancy Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={occupancy} className="flex-1" />
            <span className="text-sm font-semibold text-gray-700">
              {occupancy}%
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-sm border-b pb-2"
                >
                  <div>
                    <p className="font-medium">
                      {b.userName} — {b.carNumber}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Spot {b.spotNumber} ·{" "}
                      {new Date(b.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">&#x20b9;{b.amount}</p>
                    <Badge
                      variant={
                        b.paymentStatus === "paid" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {b.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
