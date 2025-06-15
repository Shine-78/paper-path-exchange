
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Point {
  latitude: number;
  longitude: number;
}

interface LeafletBookRouteMapProps {
  buyer?: Point | null;
  seller?: Point | null;
}

const buyerIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const sellerIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

export const LeafletBookRouteMap: React.FC<LeafletBookRouteMapProps> = ({
  buyer,
  seller,
}) => {
  if (!buyer || !seller) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-900 rounded-lg">
        Location information incomplete.
      </div>
    );
  }

  const positions: [number, number][] = [
    [buyer.latitude, buyer.longitude],
    [seller.latitude, seller.longitude],
  ];
  const center = [
    (buyer.latitude + seller.latitude) / 2,
    (buyer.longitude + seller.longitude) / 2,
  ];
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
        <svg className="w-4 h-4 text-purple-700" viewBox="0 0 20 20" fill="none"><path d="M2 10h16M10 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <span className="font-semibold">
          Distance: <span className="text-purple-700">{distInt} km</span>
        </span>
      </div>
      <div style={{ height: 320, maxHeight: "50vw", minHeight: 200 }} className="rounded-lg border overflow-hidden">
        <MapContainer
          center={center as [number, number]}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            // OpenStreetMap tiles (free, no API key required)
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={positions[0]} icon={buyerIcon}>
            <Popup>
              <b>Buyer Location</b>
              <br />Lat: {positions[0][0]}
              <br />Lng: {positions[0][1]}
            </Popup>
          </Marker>
          <Marker position={positions[1]} icon={sellerIcon}>
            <Popup>
              <b>Seller Location</b>
              <br />Lat: {positions[1][0]}
              <br />Lng: {positions[1][1]}
            </Popup>
          </Marker>
          <Polyline positions={positions} color="#a21caf" dashArray="6,8" />
        </MapContainer>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        This is an estimated straight-line distance, actual travel route may vary.
      </div>
    </div>
  );
};
