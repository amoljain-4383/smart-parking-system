import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "../../App";
import {
  type Notification,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import { Button } from "../ui/button";

interface Props {
  session: Session;
}

export default function UserNotifications({ session }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const load = useCallback(() => {
    const state = getParkingState();
    setNotifs(
      state.notifications
        .filter((n) => n.carNumber === session.carNumber)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    );
  }, [session.carNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = () => {
    const state = getParkingState();
    const updated = {
      ...state,
      notifications: state.notifications.map((n) =>
        n.carNumber === session.carNumber ? { ...n, read: true } : n,
      ),
    };
    saveParkingState(updated);
    load();
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-700">
          {unread > 0
            ? `${unread} unread notification${unread > 1 ? "s" : ""}`
            : "All caught up"}
        </p>
        {unread > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={markAllRead}
          >
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        notifs.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border ${n.read ? "bg-white" : "bg-blue-50 border-blue-200"}`}
          >
            <div className="flex items-start gap-3">
              <Bell
                size={16}
                className={
                  n.read ? "text-gray-400 mt-0.5" : "text-blue-500 mt-0.5"
                }
              />
              <div>
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
