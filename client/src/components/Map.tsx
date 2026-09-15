import React, { useState } from "react";
import { LocateFixed, MapPin, ZoomIn, ZoomOut } from "lucide-react";

export interface MapPinItem {
  id: number;
  referenceCode?: string;
  title: string;
  categorySlug: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  upvoteCount?: number;
}

interface InteractiveCivicMapProps {
  pins?: MapPinItem[];
  selectedPinId?: number | null;
  onSelectPin?: (pin: MapPinItem) => void;
  className?: string;
  center?: { lat: number; lng: number };
  onLocationPick?: (coords: { lat: number; lng: number }) => void;
  isPicker?: boolean;
}

export function InteractiveCivicMap({
  pins = [],
  selectedPinId,
  onSelectPin,
  className = "",
  center = { lat: 17.4968, lng: 78.3565 },
  onLocationPick,
  isPicker = false,
}: InteractiveCivicMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pickedPoint, setPickedPoint] = useState<{ x: number; y: number } | null>(null);

  // Convert lat/lng to percentage on the stylized map grid
  const getPinPos = (lat: number, lng: number, idx: number) => {
    // Reference center around Hyderabad (17.496, 78.356)
    const dLat = (lat - center.lat) * 2000;
    const dLng = (lng - center.lng) * 2000;
    const x = Math.min(88, Math.max(12, 50 + dLng + (idx % 3 - 1) * 8));
    const y = Math.min(84, Math.max(16, 50 - dLat + (Math.floor(idx / 2) % 3 - 1) * 7));
    return { left: `${x}%`, top: `${y}%` };
  };

  const getPinColorClass = (pin: MapPinItem) => {
    if (pin.status === "resolved" || pin.status === "closed") return "green";
    if (pin.priority === "urgent" || pin.priority === "high") return "red";
    if (pin.status === "in_progress") return "orange";
    return "yellow";
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPicker) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPickedPoint({ x, y });

    // Derive slight lat/lng delta
    const dLat = (50 - y) / 2000;
    const dLng = (x - 50) / 2000;
    const newCoords = {
      lat: Number((center.lat + dLat).toFixed(5)),
      lng: Number((center.lng + dLng).toFixed(5)),
    };
    if (onLocationPick) onLocationPick(newCoords);
  };

  return (
    <div className={`map-surface ${className}`} onClick={handleMapClick} style={{ cursor: isPicker ? "crosshair" : "default" }}>
      {/* Decorative vector map elements */}
      <div className="map-water" />
      <div className="map-road road-a" />
      <div className="map-road road-b" />
      <div className="map-road road-c" />
      <div className="map-road road-d" />
      <div className="map-block block-a" />
      <div className="map-block block-b" />
      <div className="map-block block-c" />
      <div className="map-block block-d" />

      {/* Street labels */}
      <div className="map-label label-one">
        <MapPin size={10} /> Miyapur Cross Road
      </div>
      <div className="map-label label-two">
        <MapPin size={10} /> Hafeezpet Stn Rd
      </div>

      {/* Location Picker indicator */}
      {isPicker && (
        <div
          className="map-center-pin"
          style={{
            position: "absolute",
            left: pickedPoint ? `${pickedPoint.x}%` : "50%",
            top: pickedPoint ? `${pickedPoint.y}%` : "50%",
            transform: "translate(-50%, -100%)",
            zIndex: 10,
            transition: "all 0.15s ease-out",
          }}
        >
          <MapPin size={32} className="text-emerald-700 drop-shadow-md fill-emerald-600 text-white" />
        </div>
      )}

      {/* Render Pin Markers */}
      {!isPicker &&
        pins.map((pin, index) => {
          const pos = getPinPos(pin.latitude, pin.longitude, index);
          const isSelected = selectedPinId === pin.id;
          const colorClass = getPinColorClass(pin);

          return (
            <button
              key={pin.id}
              className={`map-dot ${colorClass} ${isSelected ? "ring-4 ring-emerald-500 scale-125 z-20" : ""}`}
              style={{
                ...pos,
                position: "absolute",
                cursor: "pointer",
                transition: "transform 0.18s ease",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectPin) onSelectPin(pin);
              }}
              title={`${pin.referenceCode}: ${pin.title}`}
            />
          );
        })}

      {/* Map Control Buttons */}
      <div className="map-control-stack">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.min(z + 0.2, 1.6));
          }}
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.max(z - 0.2, 0.8));
          }}
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPickedPoint({ x: 50, y: 50 });
          }}
          title="Center map"
        >
          <LocateFixed size={15} />
        </button>
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <span>
          <span className="legend-dot red" /> High Priority
        </span>
        <span>
          <span className="legend-dot orange" /> In Progress
        </span>
        <span>
          <span className="legend-dot green" /> Resolved
        </span>
      </div>
    </div>
  );
}

export function MapView(props: any) {
  return <InteractiveCivicMap {...props} />;
}
