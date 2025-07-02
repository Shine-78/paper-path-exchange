
import { MapPin, Navigation } from "lucide-react";

interface LocationDisplayProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  showCoordinates?: boolean;
  className?: string;
}

export const LocationDisplay = ({ 
  address, 
  latitude, 
  longitude, 
  showCoordinates = false,
  className = "" 
}: LocationDisplayProps) => {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {address && (
        <div className="text-sm flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 text-gray-500" />
          <span className="text-gray-600">{address}</span>
        </div>
      )}
      
      {hasCoordinates && showCoordinates && (
        <div className="text-xs flex items-center gap-1 text-gray-500">
          <Navigation className="h-3 w-3" />
          <span>{latitude!.toFixed(4)}, {longitude!.toFixed(4)}</span>
        </div>
      )}
      
      {!address && !hasCoordinates && (
        <div className="text-sm text-gray-400 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          No location provided
        </div>
      )}
    </div>
  );
};
