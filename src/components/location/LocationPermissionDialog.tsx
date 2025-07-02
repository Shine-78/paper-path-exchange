
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Shield, AlertTriangle } from 'lucide-react';
import { locationService, LocationData, LocationError } from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';

interface LocationPermissionDialogProps {
  onLocationGranted: (location: LocationData) => void;
  onLocationDenied: () => void;
}

export const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  onLocationGranted,
  onLocationDenied,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkLocationStatus = async () => {
      // Check if location permission was previously denied
      const locationDenied = localStorage.getItem('locationPermissionDenied');
      const cachedLocation = locationService.getCachedLocation();
      
      if (cachedLocation) {
        console.log('Using cached location:', cachedLocation);
        onLocationGranted(cachedLocation);
        return;
      }

      if (locationDenied === 'true') {
        console.log('Location previously denied');
        onLocationDenied();
        return;
      }

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        setError('Geolocation is not supported by your browser');
        onLocationDenied();
        return;
      }

      // Check current permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          console.log('Current permission status:', permission.state);
          
          if (permission.state === 'granted') {
            // Try to get location immediately
            try {
              const location = await locationService.getCurrentLocation();
              onLocationGranted(location);
              return;
            } catch (error) {
              console.log('Failed to get location despite permission granted:', error);
            }
          } else if (permission.state === 'denied') {
            onLocationDenied();
            return;
          }
        } catch (error) {
          console.log('Permission query failed:', error);
        }
      }

      // Show dialog after a brief delay to let the app load
      setTimeout(() => {
        setIsOpen(true);
      }, 1500);
    };

    checkLocationStatus();
  }, [onLocationGranted, onLocationDenied]);

  const handleAllowLocation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Requesting location permission...');
      const location = await locationService.requestLocationPermission();
      console.log('Location granted:', location);
      
      localStorage.removeItem('locationPermissionDenied');
      onLocationGranted(location);
      setIsOpen(false);
      
      toast({
        title: "Location Access Granted",
        description: "We'll now show you books near your location and calculate distances accurately.",
      });
    } catch (error) {
      const locationError = error as LocationError;
      console.error('Location request failed:', locationError);
      
      setError(locationError.message);
      
      toast({
        title: "Location Access Failed",
        description: locationError.message,
        variant: "destructive",
      });
      
      // Auto-close dialog and call denied handler after a delay
      setTimeout(() => {
        handleDenyLocation();
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDenyLocation = () => {
    localStorage.setItem('locationPermissionDenied', 'true');
    onLocationDenied();
    setIsOpen(false);
    toast({
      title: "Location Access Denied",
      description: "You can still browse books, but distance calculations won't be available. You can enable location access later in your browser settings.",
      variant: "destructive",
    });
  };

  const handleRetry = () => {
    setError(null);
    handleAllowLocation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) {
        handleDenyLocation();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            Enable Location Access
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
            {error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Location Error</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
                <div className="mt-3 space-y-2 text-xs text-red-600">
                  <p>• Make sure location services are enabled on your device</p>
                  <p>• Check if your browser allows location access for this site</p>
                  <p>• Try refreshing the page if the issue persists</p>
                </div>
              </div>
            ) : (
              <>
                <p>
                  To provide you with the best book discovery experience, we'd like to access your location.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Navigation className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800">
                      Find books near you and calculate accurate distances
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-800">
                      Show route information between you and sellers
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Shield className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="text-sm text-purple-800">
                      Your location data is never stored or shared
                    </span>
                  </div>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          {error ? (
            <>
              <Button 
                onClick={handleRetry} 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Retrying...
                  </div>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDenyLocation}
                className="w-full"
              >
                Continue Without Location
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleAllowLocation} 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Getting Location...
                  </div>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Allow Location Access
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDenyLocation}
                className="w-full"
                disabled={isLoading}
              >
                Maybe Later
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
