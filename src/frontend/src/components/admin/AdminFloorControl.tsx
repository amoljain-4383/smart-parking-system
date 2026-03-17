import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type ParkingSpot,
  type ParkingState,
  getParkingState,
  saveParkingState,
} from "../../lib/parkingStore";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

function generateSpots(
  floorId: string,
  count: number,
  prefix: string,
): ParkingSpot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${floorId}-spot-${i + 1}`,
    floorId,
    spotNumber: `${prefix}${i + 1}`,
    status: "available" as const,
  }));
}

export default function AdminFloorControl() {
  const [state, setState] = useState<ParkingState | null>(null);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorSpots, setNewFloorSpots] = useState("10");

  useEffect(() => {
    setState(getParkingState());
  }, []);
  if (!state) return null;

  const toggleMultiFloor = (checked: boolean) => {
    const updated = { ...state, isMultiFloor: checked };
    if (!checked) {
      const floor = state.floors[0] ?? {
        id: "floor-1",
        name: "Ground Floor",
        spotCount: 20,
      };
      const spots = generateSpots(floor.id, floor.spotCount, "A");
      updated.floors = [floor];
      updated.spots = spots;
    }
    saveParkingState(updated);
    setState(updated);
  };

  const updateSpotCount = (floorId: string, count: number) => {
    if (count < 1 || count > 100) return;
    const floorIndex = state.floors.findIndex((f) => f.id === floorId);
    const prefix = String.fromCharCode(65 + floorIndex);
    const newSpots = generateSpots(floorId, count, prefix);
    const updated = {
      ...state,
      floors: state.floors.map((f) =>
        f.id === floorId ? { ...f, spotCount: count } : f,
      ),
      spots: [...state.spots.filter((s) => s.floorId !== floorId), ...newSpots],
    };
    saveParkingState(updated);
    setState(updated);
  };

  const addFloor = () => {
    if (!newFloorName.trim()) return;
    const count = Number.parseInt(newFloorSpots) || 10;
    const id = `floor-${Date.now()}`;
    const prefix = String.fromCharCode(65 + state.floors.length);
    const newFloor = { id, name: newFloorName.trim(), spotCount: count };
    const newSpots = generateSpots(id, count, prefix);
    const updated = {
      ...state,
      floors: [...state.floors, newFloor],
      spots: [...state.spots, ...newSpots],
    };
    saveParkingState(updated);
    setState(updated);
    setNewFloorName("");
    setNewFloorSpots("10");
  };

  const removeFloor = (floorId: string) => {
    if (state.floors.length <= 1) return;
    const updated = {
      ...state,
      floors: state.floors.filter((f) => f.id !== floorId),
      spots: state.spots.filter((s) => s.floorId !== floorId),
      bookings: state.bookings.filter((b) => b.floorId !== floorId),
    };
    saveParkingState(updated);
    setState(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Switch
          checked={state.isMultiFloor}
          onCheckedChange={toggleMultiFloor}
          id="multi-floor"
        />
        <Label htmlFor="multi-floor" className="text-base font-medium">
          {state.isMultiFloor ? "Multi-Floor Mode" : "Single Floor Mode"}
        </Label>
      </div>
      <div className="space-y-3">
        {state.floors.map((floor, idx) => (
          <Card key={floor.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{floor.name}</p>
                <p className="text-xs text-gray-500">
                  Prefix: {String.fromCharCode(65 + idx)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Spots:</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={floor.spotCount}
                  onChange={(e) =>
                    updateSpotCount(floor.id, Number.parseInt(e.target.value))
                  }
                  className="w-20"
                />
              </div>
              {state.isMultiFloor && state.floors.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFloor(floor.id)}
                >
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {state.isMultiFloor && (
        <Card>
          <CardContent className="p-4">
            <p className="font-medium text-gray-700 mb-3">Add New Floor</p>
            <div className="flex gap-3">
              <Input
                placeholder="Floor name e.g. Level 2"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Spots"
                value={newFloorSpots}
                onChange={(e) => setNewFloorSpots(e.target.value)}
                className="w-24"
              />
              <Button
                type="button"
                onClick={addFloor}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={16} className="mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
