
import { MapPin, Navigation, Globe } from "lucide-react";

interface LocationDisplayProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  showCoordinates?: boolean;
  className?: string;
  compact?: boolean;
}

export const LocationDisplay = ({ 
  address, 
  latitude, 
  longitude, 
  showCoordinates = false,
  compact = false,
  className = "" 
}: LocationDisplayProps) => {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {hasCoordinates ? (
          <>
            <Navigation className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-600 font-medium">GPS Located</span>
            {showCoordinates && (
              <span className="text-xs text-gray-500">
                ({latitude!.toFixed(4)}, {longitude!.toFixed(4)})
              </span>
            )}
          </>
        ) : address ? (
          <>
            <MapPin className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium truncate max-w-32" title={address}>
              {address}
            </span>
          </>
        ) : (
          <>
            <Globe className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">No location</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {address && (
        <div className="text-sm flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
          <MapPin className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">Address:</p>
            <p className="text-blue-700">{address}</p>
          </div>
        </div>
      )}
      
      {hasCoordinates && (
        <div className="text-sm flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
          <Navigation className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">GPS Coordinates:</p>
            <p className="text-green-700 font-mono">
              {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
            </p>
          </div>
        </div>
      )}
      
      {!address && !hasCoordinates && (
        <div className="text-sm flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
          <Globe className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">No location information provided</span>
        </div>
      )}
    </div>
  );
};
