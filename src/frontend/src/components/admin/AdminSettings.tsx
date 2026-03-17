import { useEffect, useState } from "react";
import type { Session } from "../../App";
import {
  type ParkingState,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Props {
  session: Session;
}

export default function AdminSettings({ session }: Props) {
  const [state, setState] = useState<ParkingState | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [msg, setMsg] = useState("");
  const [rateMsg, setRateMsg] = useState("");

  useEffect(() => {
    const s = getParkingState();
    setState(s);
    setHourlyRate(s.hourlyRate.toString());
  }, []);
  if (!state) return null;

  const savePassword = () => {
    if (session.username !== "admin") {
      setMsg("Password can only be changed for the 'admin' account.");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    const updated = { ...state, adminPassword: newPassword };
    saveParkingState(updated);
    setState(updated);
    setNewPassword("");
    setConfirmPassword("");
    setMsg("Password updated successfully!");
  };

  const saveRate = () => {
    const rate = Number.parseFloat(hourlyRate);
    if (Number.isNaN(rate) || rate <= 0) {
      setRateMsg("Enter a valid rate.");
      return;
    }
    const updated = { ...state, hourlyRate: rate };
    saveParkingState(updated);
    setState(updated);
    setRateMsg("Rate updated successfully!");
  };

  const triggerExpiryCheck = () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);
    const newNotifs = state.bookings
      .filter((b) => {
        const end = new Date(b.endTime);
        return end > now && end <= soon;
      })
      .map((b) => ({
        id: `notif-${Date.now()}-${b.id}`,
        carNumber: b.carNumber,
        message: `Your booking for Spot ${b.spotNumber} expires at ${new Date(b.endTime).toLocaleTimeString()}. Please vacate soon.`,
        read: false,
        createdAt: now.toISOString(),
      }));
    const updated = {
      ...state,
      notifications: [...state.notifications, ...newNotifs],
    };
    saveParkingState(updated);
    setState(updated);
    setRateMsg(`${newNotifs.length} expiry notification(s) sent.`);
  };

  return (
    <div className="space-y-6 max-w-lg">
      {session.username === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {msg && (
              <p
                className={`text-sm ${msg.includes("success") ? "text-green-600" : "text-red-500"}`}
              >
                {msg}
              </p>
            )}
            <Button
              type="button"
              onClick={savePassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Parking Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Rate (&#x20b9; per hour)</Label>
            <Input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
          {rateMsg && (
            <p
              className={`text-sm ${rateMsg.includes("success") || rateMsg.includes("sent") ? "text-green-600" : "text-red-500"}`}
            >
              {rateMsg}
            </p>
          )}
          <Button
            type="button"
            onClick={saveRate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Rate
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Expiry Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Send in-app alerts to users whose bookings expire within the next 15
            minutes.
          </p>
          <Button type="button" onClick={triggerExpiryCheck} variant="outline">
            Trigger Expiry Check
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
