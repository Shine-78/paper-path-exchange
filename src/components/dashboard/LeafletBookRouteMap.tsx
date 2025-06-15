
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Navigation, Clock, Car } from "lucide-react";

// Fix for default markers in Leaflet with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Point {
  latitude: number;
  longitude: number;
}

interface LeafletBookRouteMapProps {
  buyer?: Point | null;
  seller?: Point | null;
}

// Custom icons for buyer and seller
const buyerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const sellerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Calculate distance using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
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

// Estimate travel time (assuming average speed of 50 km/h in city)
function estimateTravelTime(distanceKm: number) {
  const avgSpeedKmh = 50;
  const timeHours = distanceKm / avgSpeedKmh;
  const minutes = Math.round(timeHours * 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

// Get cardinal direction
function getDirection(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  return directions[index];
}

export const LeafletBookRouteMap: React.FC<LeafletBookRouteMapProps> = ({
  buyer,
  seller,
}) => {
  console.log('LeafletBookRouteMap rendered with:', { buyer, seller });

  if (!buyer || !seller) {
    return (
      <div className="p-6 bg-yellow-50 text-yellow-900 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5" />
          <span className="font-semibold">Location Information Incomplete</span>
        </div>
        <p className="text-sm">
          Buyer: {buyer ? '✓ Available' : '✗ Missing'}, 
          Seller: {seller ? '✓ Available' : '✗ Missing'}
        </p>
      </div>
    );
  }

  const positions: [number, number][] = [
    [buyer.latitude, buyer.longitude],
    [seller.latitude, seller.longitude],
  ];
  
  const center: [number, number] = [
    (buyer.latitude + seller.latitude) / 2,
    (buyer.longitude + seller.longitude) / 2,
  ];
  
  const distance = haversineDistance(
    buyer.latitude,
    buyer.longitude,
    seller.latitude,
    seller.longitude
  );
  
  const travelTime = estimateTravelTime(distance);
  const direction = getDirection(
    buyer.latitude,
    buyer.longitude,
    seller.latitude,
    seller.longitude
  );

  // Calculate appropriate zoom level based on distance
  const getZoomLevel = (distKm: number) => {
    if (distKm < 1) return 15;
    if (distKm < 5) return 13;
    if (distKm < 20) return 11;
    if (distKm < 50) return 9;
    if (distKm < 100) return 8;
    return 7;
  };

  const zoomLevel = getZoomLevel(distance);

  console.log('Map data:', { 
    positions, 
    center, 
    distance: distance.toFixed(1),
    travelTime,
    direction,
    zoom: zoomLevel
  });

  return (
    <div className="w-full space-y-4">
      {/* Distance and Route Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-full">
            <Navigation className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Distance</p>
            <p className="font-bold text-lg text-purple-700">{distance.toFixed(1)} km</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Est. Travel Time</p>
            <p className="font-bold text-lg text-blue-700">{travelTime}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <Car className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Direction</p>
            <p className="font-bold text-lg text-green-700">{direction}</p>
          </div>
        </div>
      </div>

      {/* Location Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="font-semibold text-blue-800">Buyer Location</span>
          </div>
          <p className="text-sm text-blue-700">
            Lat: {buyer.latitude.toFixed(6)}<br/>
            Lng: {buyer.longitude.toFixed(6)}
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-semibold text-green-800">Seller Location</span>
          </div>
          <p className="text-sm text-green-700">
            Lat: {seller.latitude.toFixed(6)}<br/>
            Lng: {seller.longitude.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="w-full h-96 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100 shadow-lg">
        <MapContainer
          center={center}
          zoom={zoomLevel}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          {/* Use OpenStreetMap tiles (free) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={18}
          />
          
          {/* Buyer Marker */}
          <Marker position={positions[0]} icon={buyerIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-bold text-blue-700 mb-1">📍 Buyer Location</div>
                <div className="text-sm space-y-1">
                  <p><strong>Coordinates:</strong></p>
                  <p>Lat: {positions[0][0].toFixed(6)}</p>
                  <p>Lng: {positions[0][1].toFixed(6)}</p>
                  <p className="mt-2 text-blue-600">
                    <strong>Distance to seller:</strong> {distance.toFixed(1)} km
                  </p>
                </div>
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -41]} opacity={1}>
              <span className="font-semibold">Buyer Location</span>
            </Tooltip>
          </Marker>
          
          {/* Seller Marker */}
          <Marker position={positions[1]} icon={sellerIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-bold text-green-700 mb-1">📍 Seller Location</div>
                <div className="text-sm space-y-1">
                  <p><strong>Coordinates:</strong></p>
                  <p>Lat: {positions[1][0].toFixed(6)}</p>
                  <p>Lng: {positions[1][1].toFixed(6)}</p>
                  <p className="mt-2 text-green-600">
                    <strong>Distance to buyer:</strong> {distance.toFixed(1)} km
                  </p>
                </div>
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -41]} opacity={1}>
              <span className="font-semibold">Seller Location</span>
            </Tooltip>
          </Marker>
          
          {/* Route Line */}
          <Polyline 
            positions={positions} 
            color="#8b5cf6" 
            weight={4} 
            opacity={0.8}
            dashArray="10,10"
          />
        </MapContainer>
      </div>
      
      {/* Route Information Footer */}
      <div className="text-center p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
        <p className="flex items-center justify-center gap-2">
          <Navigation className="w-4 h-4" />
          This shows the straight-line distance between locations. 
          Actual travel route and time may vary based on roads and traffic conditions.
        </p>
        <p className="mt-1 text-xs">
          Using OpenStreetMap - Free mapping service with detailed geographical information
        </p>
      </div>
    </div>
  );
};
