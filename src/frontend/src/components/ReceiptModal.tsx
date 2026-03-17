import { Car, Printer, X } from "lucide-react";
import type { Booking } from "../lib/parkingStore";
import { Button } from "./ui/button";

interface Props {
  booking: Booking;
  onClose: () => void;
}

export default function ReceiptModal({ booking, onClose }: Props) {
  const durMs =
    new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
  const hours = Math.floor(durMs / 3600000);
  const minutes = Math.floor((durMs % 3600000) / 60000);
  const statusLabel =
    booking.paymentStatus === "paid"
      ? "Paid"
      : booking.paymentStatus === "cash"
        ? "Cash (Pending)"
        : "Pending";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">Parking Receipt</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div id="receipt-content" className="p-6 space-y-4">
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Car size={22} className="text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SmartPark</span>
            </div>
            <p className="text-xs text-gray-400">Parking Receipt</p>
          </div>
          <div className="border-t border-dashed pt-4 space-y-2 text-sm">
            <Row label="Receipt No." value={booking.id} mono />
            <Row
              label="Date"
              value={new Date(booking.createdAt).toLocaleDateString()}
            />
            <Row label="Customer" value={booking.userName} />
            <Row label="Car Number" value={booking.carNumber} mono />
            <Row label="Spot" value={booking.spotNumber} />
            {booking.floorName && (
              <Row label="Floor" value={booking.floorName} />
            )}
            <Row
              label="Start Time"
              value={new Date(booking.startTime).toLocaleString()}
            />
            <Row
              label="End Time"
              value={new Date(booking.endTime).toLocaleString()}
            />
            <Row label="Duration" value={`${hours}h ${minutes}m`} />
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <Row
              label="Payment Method"
              value={
                booking.paymentMethod === "online" ? "Online (Card)" : "Cash"
              }
            />
            <Row label="Payment Status" value={statusLabel} />
            <div className="flex justify-between font-bold text-base mt-2">
              <span>Total Amount</span>
              <span className="text-blue-700">&#x20b9;{booking.amount}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="flex-1"
          >
            <Printer size={16} className="mr-2" /> Print
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span
        className={`font-medium text-gray-800 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
