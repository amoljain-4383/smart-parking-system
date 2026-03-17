import {
  BookOpen,
  Car,
  CreditCard,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ParkingSquare,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Session } from "../App";
import AdminBookings from "../components/admin/AdminBookings";
import AdminFloorControl from "../components/admin/AdminFloorControl";
import AdminOverview from "../components/admin/AdminOverview";
import AdminPayments from "../components/admin/AdminPayments";
import AdminSettings from "../components/admin/AdminSettings";
import AdminSpotManagement from "../components/admin/AdminSpotManagement";

type Tab =
  | "overview"
  | "spots"
  | "floors"
  | "bookings"
  | "payments"
  | "settings";

interface Props {
  session: Session;
  onLogout: () => void;
}

const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "spots", label: "Spot Management", icon: <ParkingSquare size={18} /> },
  { id: "floors", label: "Floor Control", icon: <Layers size={18} /> },
  { id: "bookings", label: "Bookings", icon: <BookOpen size={18} /> },
  { id: "payments", label: "Payments", icon: <CreditCard size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

export default function AdminDashboard({ session, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const renderContent = () => {
    switch (tab) {
      case "overview":
        return <AdminOverview />;
      case "spots":
        return <AdminSpotManagement />;
      case "floors":
        return <AdminFloorControl />;
      case "bookings":
        return <AdminBookings />;
      case "payments":
        return <AdminPayments />;
      case "settings":
        return <AdminSettings session={session} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-60 bg-gray-900 text-white flex flex-col transform transition-transform md:relative md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
          <Car size={22} className="text-blue-400" />
          <span className="font-bold text-lg">SmartPark</span>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                tab === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">
            Logged in as{" "}
            <span className="font-semibold text-white">{session.username}</span>
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setMenuOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="font-semibold text-gray-800">
            {navItems.find((n) => n.id === tab)?.label}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
