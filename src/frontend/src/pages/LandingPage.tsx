import { Bell, Car, Clock, CreditCard, MapPin, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

interface Props {
  onBook: () => void;
  onAdmin: () => void;
}

const DEMO_SPOTS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "C1",
  "C2",
  "C3",
  "C4",
  "D1",
  "D2",
  "D3",
  "D4",
];
const OCCUPIED_IDX = new Set([2, 5, 11]);
const RESERVED_IDX = new Set([7]);

export default function LandingPage({ onBook, onAdmin }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="text-blue-600" size={28} />
            <span className="text-xl font-bold text-gray-900">SmartPark</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-blue-600">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-blue-600">
              How It Works
            </a>
            <Button variant="outline" size="sm" onClick={onAdmin}>
              Admin Login
            </Button>
          </nav>
          <Button
            size="sm"
            onClick={onBook}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Book a Spot
          </Button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Smart Parking,
            <br />
            <span className="text-blue-600">Simplified</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8">
            Book your parking spot in seconds. No hassle, no waiting. Real-time
            availability, instant confirmation, and secure payments.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={onBook}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Book a Spot
            </Button>
            <Button variant="outline" onClick={onAdmin} className="px-6">
              Admin Login
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Shield size={14} className="text-green-500" /> Secure Payments
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-blue-500" /> 24/7 Available
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-red-500" /> Real-time Spots
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 border">
          <div className="grid grid-cols-4 gap-3">
            {DEMO_SPOTS.map((label, i) => (
              <div
                key={label}
                className={`h-12 rounded-lg flex items-center justify-center text-xs font-bold ${
                  OCCUPIED_IDX.has(i)
                    ? "bg-red-100 text-red-600 border border-red-200"
                    : RESERVED_IDX.has(i)
                      ? "bg-yellow-100 text-yellow-600 border border-yellow-200"
                      : "bg-green-100 text-green-600 border border-green-200"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-500">
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
      </section>

      <section id="features" className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Everything You Need
          </h2>
          <p className="text-center text-gray-500 mb-12">
            A complete parking management solution for drivers and
            administrators
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MapPin size={24} />,
                title: "Easy Booking",
                desc: "Browse available spots on a live map, select yours, and confirm in seconds.",
              },
              {
                icon: <CreditCard size={24} />,
                title: "Secure Payments",
                desc: "Pay online with card via Stripe, or opt for cash payment at the spot.",
              },
              {
                icon: <Bell size={24} />,
                title: "Smart Notifications",
                desc: "Get in-app alerts when your parking time is about to expire.",
              },
            ].map((f) => (
              <Card key={f.title} className="border shadow-sm">
                <CardContent className="p-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Enter Your Details",
                desc: "Log in with your name and car number. No password needed.",
              },
              {
                step: "2",
                title: "Choose a Spot",
                desc: "View the live map and pick any available green spot.",
              },
              {
                step: "3",
                title: "Pay & Park",
                desc: "Pay online or cash. Get your receipt and park with confidence.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Park Smarter?
          </h2>
          <p className="text-blue-100 mb-8">
            Join thousands of drivers who save time with SmartPark.
          </p>
          <Button
            onClick={onBook}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-base font-semibold"
          >
            Book Your Spot Now
          </Button>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <Car size={20} />
            <span className="font-bold">SmartPark</span>
          </div>
          <p className="text-sm">&copy; 2026 SmartPark. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
