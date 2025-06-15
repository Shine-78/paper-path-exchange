
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Shield } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    // Check if location permission was previously denied
    const locationDenied = localStorage.getItem('locationPermissionDenied');
    const cachedLocation = locationService.getCachedLocation();
    
    if (!locationDenied && !cachedLocation) {
      // Show dialog after a brief delay to let the app load
      setTimeout(() => {
        setIsOpen(true);
      }, 2000);
    } else if (cachedLocation) {
      onLocationGranted(cachedLocation);
    }
  }, [onLocationGranted]);

  const handleAllowLocation = async () => {
    setIsLoading(true);
    try {
      const location = await locationService.requestLocationPermission();
      localStorage.removeItem('locationPermissionDenied');
      onLocationGranted(location);
      setIsOpen(false);
      toast({
        title: "Location Access Granted",
        description: "We'll now show you books near your location and calculate distances accurately.",
      });
    } catch (error) {
      const locationError = error as LocationError;
      toast({
        title: "Location Access Failed",
        description: locationError.message,
        variant: "destructive",
      });
      handleDenyLocation();
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
      description: "You can still browse books, but distance calculations won't be available.",
      variant: "destructive",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            Enable Location Access
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
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
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
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
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
