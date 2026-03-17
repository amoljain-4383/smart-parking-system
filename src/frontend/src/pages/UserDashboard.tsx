import { Car, LogOut } from "lucide-react";
import { useState } from "react";
import type { Session } from "../App";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import UserBookSpot from "../components/user/UserBookSpot";
import UserMyBookings from "../components/user/UserMyBookings";
import UserNotifications from "../components/user/UserNotifications";

interface Props {
  session: Session;
  onLogout: () => void;
}

export default function UserDashboard({ session, onLogout }: Props) {
  const [tab, setTab] = useState("book");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="text-blue-600" size={24} />
            <span className="font-bold text-gray-900">SmartPark</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-semibold text-gray-800">{session.name}</p>
              <p className="text-gray-500 text-xs">{session.carNumber}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="book">Book a Spot</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="book">
            <UserBookSpot session={session} />
          </TabsContent>
          <TabsContent value="bookings">
            <UserMyBookings session={session} />
          </TabsContent>
          <TabsContent value="notifications">
            <UserNotifications session={session} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
