
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { locationService, LocationData } from "@/services/locationService";

interface Book {
  id: string;
  title: string;
  author: string;
  condition: string;
  price_range: number;
  transfer_type: string;
  seller_id: string;
  profiles?: {
    full_name: string;
  };
}

interface PurchaseRequestModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseRequestModal = ({ book, isOpen, onClose }: PurchaseRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState(book.price_range);
  const [transferMode, setTransferMode] = useState("self-transfer");
  const [message, setMessage] = useState("");
  const [buyerLocation, setBuyerLocation] = useState<LocationData | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const cachedLocation = locationService.getCachedLocation();
      if (cachedLocation) {
        setBuyerLocation(cachedLocation);
        console.log('Using cached buyer location:', cachedLocation);
      }
      // Reset error when modal opens
      setLocationError(null);
    }
  }, [isOpen]);

  const handleGetLocation = async () => {
    console.log('Get location button clicked');
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      // Check permission status first
      const permissionStatus = await locationService.checkPermissionStatus();
      console.log('Permission status:', permissionStatus);
      
      if (permissionStatus === 'denied') {
        throw new Error('Location access is denied. Please enable location permissions in your browser settings.');
      }

      console.log('Requesting current location...');
      const location = await locationService.getCurrentLocation();
      console.log('Location received:', location);
      
      setBuyerLocation(location);
      
      toast({
        title: "Location Captured Successfully",
        description: `Your location has been captured with ${location.accuracy ? `±${Math.round(location.accuracy)}m accuracy` : 'good accuracy'}.`,
      });
    } catch (error: any) {
      console.error('Location error details:', error);
      const errorMessage = error.message || "Failed to get your location";
      setLocationError(errorMessage);
      
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate location requirement
    if (!buyerLocation && !locationAddress.trim()) {
      toast({
        title: "Location Required",
        description: "Please provide your location using GPS or enter your address manually.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to send a purchase request");

      // Update buyer's profile with location if GPS location is available
      if (buyerLocation) {
        console.log('Updating buyer profile with GPS location:', buyerLocation);
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            latitude: buyerLocation.latitude,
            longitude: buyerLocation.longitude,
            location_address: locationAddress.trim() || null,
          })
          .eq("id", user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }
      } else if (locationAddress.trim()) {
        // Update profile with just the address if no GPS location
        console.log('Updating buyer profile with address only');
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            location_address: locationAddress.trim(),
          })
          .eq("id", user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }
      }

      console.log('Creating purchase request...');
      const { data, error } = await supabase.from("purchase_requests").insert({
        book_id: book.id,
        buyer_id: user.id,
        seller_id: book.seller_id,
        offered_price: offeredPrice,
        transfer_mode: transferMode,
        message: message || null,
        status: 'pending'
      }).select().single();

      if (error) {
        console.error('Purchase request error:', error);
        throw error;
      }

      console.log('Purchase request created successfully:', data);

      // Create notification for seller with location info
      try {
        const locationInfo = buyerLocation 
          ? `GPS Location: ${buyerLocation.latitude.toFixed(4)}, ${buyerLocation.longitude.toFixed(4)}`
          : locationAddress.trim() ? `Address: ${locationAddress.trim()}` : '';
        
        const notificationMessage = `New purchase request for "${book.title}" - Offer: ₹${offeredPrice}. ${locationInfo}`;

        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: book.seller_id,
          type: 'purchase_request',
          title: 'New Purchase Request',
          message: notificationMessage,
          related_id: book.id,
          priority: 'normal'
        });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      } catch (notificationError) {
        console.error('Notification creation failed:', notificationError);
      }

      toast({
        title: "Request Sent Successfully!",
        description: "Your purchase request with location has been sent to the seller.",
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending purchase request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send purchase request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map book transfer_type to available transfer modes for purchase requests
  const getAvailableTransferModes = () => {
    switch (book.transfer_type) {
      case "both":
        return ["self-transfer", "shipping"];
      case "self-transfer":
        return ["self-transfer"];
      case "shipping":
        return ["shipping"];
      case "pickup":
        return ["pickup"];
      default:
        return ["self-transfer"];
    }
  };

  const availableTransferModes = getAvailableTransferModes();

  // Set default transfer mode to first available option
  if (!availableTransferModes.includes(transferMode)) {
    setTransferMode(availableTransferModes[0]);
  }

  const getTransferModeLabel = (mode: string) => {
    switch (mode) {
      case "self-transfer":
        return "Self Transfer";
      case "shipping":
        return "Shipping";
      case "pickup":
        return "Pickup";
      default:
        return mode;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Purchase Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold">{book.title}</h4>
            <p className="text-sm text-gray-600">by {book.author}</p>
            <p className="text-sm text-gray-600">Seller: {book.profiles?.full_name}</p>
            <p className="text-sm text-gray-600">Listed Price: ₹{book.price_range}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="offeredPrice">Your Offer (₹)</Label>
              <Input
                id="offeredPrice"
                type="number"
                min="1"
                max={book.price_range}
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Number(e.target.value))}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum offer: ₹{book.price_range}
              </p>
            </div>

            <div>
              <Label>Transfer Method</Label>
              <RadioGroup value={transferMode} onValueChange={setTransferMode}>
                {availableTransferModes.map((mode) => (
                  <div key={mode} className="flex items-center space-x-2">
                    <RadioGroupItem value={mode} id={mode} />
                    <Label htmlFor={mode}>
                      {getTransferModeLabel(mode)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Enhanced Location Section */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <Label className="font-semibold text-blue-900">Your Location (Required)</Label>
              </div>
              
              <p className="text-sm text-blue-700">
                Please provide your location so the seller can estimate delivery feasibility and calculate distance.
              </p>

              {/* GPS Location Section */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="w-full h-12 text-base font-medium"
                >
                  {locationLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting Your Location...
                    </div>
                  ) : buyerLocation ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Update GPS Location
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Get My GPS Location
                    </div>
                  )}
                </Button>

                {/* Location Status Display */}
                {buyerLocation && (
                  <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">GPS Location Captured Successfully</span>
                    </div>
                    <p>Coordinates: {buyerLocation.latitude.toFixed(6)}, {buyerLocation.longitude.toFixed(6)}</p>
                    {buyerLocation.accuracy && (
                      <p>Accuracy: ±{Math.round(buyerLocation.accuracy)} meters</p>
                    )}
                  </div>
                )}

                {locationError && (
                  <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Location Error</p>
                      <p>{locationError}</p>
                      <p className="mt-1 text-xs">Please try again or enter your address below.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Address Section */}
              <div className="space-y-2">
                <Label htmlFor="locationAddress" className="text-sm font-medium">
                  Or Enter Your Address Manually
                </Label>
                <Textarea
                  id="locationAddress"
                  placeholder="Enter your complete address (street, area, city, pincode)..."
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Validation Message */}
              {!buyerLocation && !locationAddress.trim() && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  <strong>Required:</strong> Please provide either GPS location or your address.
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="message">Message to Seller (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a message to the seller..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  "Send Request"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
