import { useEffect, useState } from "react";
import {
  type ParkingState,
  type SpotStatus,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const statusColors: Record<SpotStatus, string> = {
  available: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  occupied: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
  reserved:
    "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
  maintenance: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200",
};

export default function AdminSpotManagement() {
  const [state, setState] = useState<ParkingState | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("floor-1");

  useEffect(() => {
    const s = getParkingState();
    setState(s);
    setSelectedFloor(s.floors[0]?.id ?? "floor-1");
  }, []);

  if (!state) return null;

  const floors = state.isMultiFloor ? state.floors : state.floors.slice(0, 1);
  const spots = state.spots.filter((s) => s.floorId === selectedFloor);

  const cycleStatus = (spotId: string) => {
    const updated = {
      ...state,
      spots: state.spots.map((s) => {
        if (s.id !== spotId) return s;
        if (s.status === "occupied" || s.status === "reserved") return s;
        return {
          ...s,
          status:
            s.status === "available"
              ? ("maintenance" as SpotStatus)
              : ("available" as SpotStatus),
        };
      }),
    };
    saveParkingState(updated);
    setState(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {state.isMultiFloor && floors.length > 1 && (
          <Select value={selectedFloor} onValueChange={setSelectedFloor}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded-full inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-full inline-block" />
            Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" />
            Reserved
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-400 rounded-full inline-block" />
            Maintenance
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Click an available spot to toggle maintenance mode. Occupied/Reserved
        spots cannot be changed.
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {spots.map((spot) => (
          <button
            type="button"
            key={spot.id}
            onClick={() => cycleStatus(spot.id)}
            disabled={spot.status === "occupied" || spot.status === "reserved"}
            className={`h-12 rounded-lg border text-xs font-bold transition-colors ${statusColors[spot.status]} disabled:cursor-not-allowed`}
          >
            {spot.spotNumber}
          </button>
        ))}
      </div>
      {spots.length === 0 && (
        <p className="text-sm text-gray-500">No spots on this floor.</p>
      )}
    </div>
  );
}
