
import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { locationService } from "@/services/locationService";
import { MapPin, Navigation, Clock, Car, AlertTriangle } from "lucide-react";

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
  showUserLocation?: boolean;
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

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
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

// Estimate travel time (assuming average speed of 40 km/h in city)
function estimateTravelTime(distanceKm: number) {
  const avgSpeedKmh = 40;
  const timeHours = distanceKm / avgSpeedKmh;
  const minutes = Math.round(timeHours * 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
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

// Get zoom level based on distance
function getZoomLevel(distKm: number) {
  if (distKm < 1) return 15;
  if (distKm < 5) return 13;
  if (distKm < 20) return 11;
  if (distKm < 50) return 9;
  if (distKm < 100) return 8;
  return 7;
}

export const LeafletBookRouteMap: React.FC<LeafletBookRouteMapProps> = ({
  buyer,
  seller,
  showUserLocation = true,
}) => {
  console.log('LeafletBookRouteMap rendered with:', { buyer, seller, showUserLocation });

  const userLocation = locationService.getCachedLocation();

  // Error state when locations are missing
  if (!buyer || !seller) {
    return (
      <div className="p-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <span className="font-semibold text-lg">Location Information Required</span>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <span className={buyer ? "text-green-600" : "text-red-600"}>
              {buyer ? "✓" : "✗"}
            </span>
            Buyer Location: {buyer ? "Available" : "Missing"}
          </p>
          <p className="flex items-center gap-2">
            <span className={seller ? "text-green-600" : "text-red-600"}>
              {seller ? "✓" : "✗"}
            </span>
            Seller Location: {seller ? "Available" : "Missing"}
          </p>
        </div>
        {userLocation && (
          <p className="text-sm text-green-700 mt-3 p-2 bg-green-50 rounded border border-green-200">
            📍 Your current location is available for when both buyer and seller locations are provided.
          </p>
        )}
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

  // Calculate distances from user location if available
  let distanceFromUser = null;
  let distanceFromUserToSeller = null;
  if (userLocation) {
    distanceFromUser = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      buyer.latitude,
      buyer.longitude
    );
    distanceFromUserToSeller = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      seller.latitude,
      seller.longitude
    );
  }

  const zoomLevel = getZoomLevel(distance);

  console.log('Map rendering with data:', { 
    distance: distance.toFixed(1),
    travelTime,
    direction,
    zoom: zoomLevel
  });

  return (
    <div className="w-full space-y-4">
      {/* Enhanced Distance and Route Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
          <div className="p-2 bg-purple-100 rounded-full">
            <Navigation className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Distance</p>
            <p className="font-bold text-xl text-purple-700">{distance.toFixed(1)} km</p>
            <p className="text-xs text-gray-500">Straight line</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
          <div className="p-2 bg-blue-100 rounded-full">
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Est. Travel</p>
            <p className="font-bold text-xl text-blue-700">{travelTime}</p>
            <p className="text-xs text-gray-500">By road</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
          <div className="p-2 bg-green-100 rounded-full">
            <Car className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Direction</p>
            <p className="font-bold text-xl text-green-700">{direction}</p>
            <p className="text-xs text-gray-500">From buyer</p>
          </div>
        </div>
      </div>

      {/* User Location Distance Info */}
      {userLocation && (distanceFromUser !== null || distanceFromUserToSeller !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="p-2 bg-orange-100 rounded-full">
              <MapPin className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">You to Buyer</p>
              <p className="font-bold text-lg text-orange-700">{distanceFromUser?.toFixed(1)} km</p>
              <p className="text-xs text-gray-500">From your location</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="p-2 bg-pink-100 rounded-full">
              <MapPin className="w-5 h-5 text-pink-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">You to Seller</p>
              <p className="font-bold text-lg text-pink-700">{distanceFromUserToSeller?.toFixed(1)} km</p>
              <p className="text-xs text-gray-500">From your location</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map */}
      <div className="w-full h-96 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100 shadow-lg">
        <MapContainer
          center={center}
          zoom={zoomLevel}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={18}
          />
          
          {/* User Location Marker */}
          {userLocation && showUserLocation && (
            <Marker 
              position={[userLocation.latitude, userLocation.longitude]} 
              icon={userIcon}
            >
              <Popup className="custom-popup">
                <div className="p-2">
                  <div className="font-bold text-red-700 mb-2">📍 Your Current Location</div>
                  <div className="text-sm space-y-1">
                    <p><strong>Coordinates:</strong></p>
                    <p className="font-mono">{userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</p>
                    {userLocation.accuracy && (
                      <p className="text-red-600 text-xs">
                        <strong>Accuracy:</strong> ±{Math.round(userLocation.accuracy)}m
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -41]} opacity={1}>
                <span className="font-semibold">Your Location</span>
              </Tooltip>
            </Marker>
          )}
          
          {/* Buyer Marker */}
          <Marker position={positions[0]} icon={buyerIcon}>
            <Popup className="custom-popup">
              <div className="p-2">
                <div className="font-bold text-blue-700 mb-2">🛒 Buyer Location</div>
                <div className="text-sm space-y-1">
                  <p><strong>Coordinates:</strong></p>
                  <p className="font-mono">{positions[0][0].toFixed(6)}, {positions[0][1].toFixed(6)}</p>
                  <p className="text-blue-600 text-xs mt-2">
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
            <Popup className="custom-popup">
              <div className="p-2">
                <div className="font-bold text-green-700 mb-2">📚 Seller Location</div>
                <div className="text-sm space-y-1">
                  <p><strong>Coordinates:</strong></p>
                  <p className="font-mono">{positions[1][0].toFixed(6)}, {positions[1][1].toFixed(6)}</p>
                  <p className="text-green-600 text-xs mt-2">
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
      
      {/* Enhanced Footer Information */}
      <div className="text-center p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
        <p className="flex items-center justify-center gap-2 mb-2">
          <Navigation className="w-4 h-4" />
          This map shows the direct distance between buyer and seller locations.
        </p>
        <p className="text-xs text-gray-500">
          Actual travel route, time, and distance may vary based on roads, traffic, and transportation method.
          Using OpenStreetMap for accurate geographical visualization.
        </p>
      </div>
    </div>
  );
};
