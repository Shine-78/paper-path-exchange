
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin, Route } from "lucide-react";

interface Point {
  latitude: number;
  longitude: number;
}

interface BookRouteMapProps {
  buyer?: Point | null;
  seller?: Point | null;
  mapboxToken: string;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const BookRouteMap: React.FC<BookRouteMapProps> = ({
  buyer,
  seller,
  mapboxToken,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || !buyer || !seller) return;
    mapboxgl.accessToken = mapboxToken;
    const center = [
      (Number(buyer.longitude) + Number(seller.longitude)) / 2,
      (Number(buyer.latitude) + Number(seller.latitude)) / 2,
    ];

    // Create the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 8,
    });

    // Buyer marker (blue)
    new mapboxgl.Marker({ color: "#2563eb" }) // Tailwind blue-600
      .setLngLat([Number(buyer.longitude), Number(buyer.latitude)])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<b>Buyer Location</b><br/>Lat: ${buyer.latitude}<br/>Lng: ${buyer.longitude}`
        )
      )
      .addTo(map.current);

    // Seller marker (green)
    new mapboxgl.Marker({ color: "#22c55e" }) // Tailwind green-500
      .setLngLat([Number(seller.longitude), Number(seller.latitude)])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<b>Seller Location</b><br/>Lat: ${seller.latitude}<br/>Lng: ${seller.longitude}`
        )
      )
      .addTo(map.current);

    // Draw line for route
    map.current.on("load", () => {
      map.current?.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [Number(buyer.longitude), Number(buyer.latitude)],
              [Number(seller.longitude), Number(seller.latitude)],
            ],
          },
        },
      });
      map.current?.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#a21caf", // purple-700
          "line-width": 4,
          "line-dasharray": [2, 2],
        },
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [buyer, seller, mapboxToken]);

  if (!buyer || !seller) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-900 rounded-lg">
        Location information incomplete.
      </div>
    );
  }

  const dist = haversineDistance(
    Number(buyer.latitude),
    Number(buyer.longitude),
    Number(seller.latitude),
    Number(seller.longitude)
  );
  const distInt = Math.round(dist * 10) / 10;

  return (
    <div>
      <div className="mb-2 flex gap-2 items-center">
        <Route className="w-4 h-4 text-purple-700" />
        <span className="font-semibold">
          Distance: <span className="text-purple-700">{distInt} km</span>
        </span>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border w-full"
        style={{ height: 320, maxHeight: "50vw", minHeight: 200 }}
      />
      <div className="mt-1 text-xs text-gray-500">
        This is an estimated straight-line distance, actual travel route may vary.
      </div>
    </div>
  );
};
