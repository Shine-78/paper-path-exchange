
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, AlertCircle } from "lucide-react";
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
    // Check if we have cached location on modal open
    if (isOpen) {
      const cachedLocation = locationService.getCachedLocation();
      if (cachedLocation) {
        setBuyerLocation(cachedLocation);
        console.log('Using cached buyer location:', cachedLocation);
      }
    }
  }, [isOpen]);

  const handleGetLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const location = await locationService.getCurrentLocation();
      setBuyerLocation(location);
      
      toast({
        title: "Location Captured",
        description: "Your location has been captured successfully.",
      });
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError(error.message || "Failed to get location");
      
      toast({
        title: "Location Error",
        description: error.message || "Failed to get your location. Please enter your address manually.",
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
        description: "Please provide your location either by GPS or entering your address.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update buyer's profile with location if GPS location is available
      if (buyerLocation) {
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

      console.log('Submitting purchase request with data:', {
        book_id: book.id,
        buyer_id: user.id,
        seller_id: book.seller_id,
        offered_price: offeredPrice,
        transfer_mode: transferMode,
        message: message || null,
      });

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
          ? `Location: ${buyerLocation.latitude.toFixed(4)}, ${buyerLocation.longitude.toFixed(4)}`
          : locationAddress.trim() ? `Address: ${locationAddress.trim()}` : '';
        
        const notificationMessage = `Someone wants to buy your book "${book.title}" for ₹${offeredPrice}. ${locationInfo}`;

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
        } else {
          console.log('Seller notification created successfully');
        }
      } catch (notificationError) {
        console.error('Notification creation failed:', notificationError);
      }

      toast({
        title: "Request sent!",
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

            {/* Location Section */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <Label className="font-medium text-blue-900">Your Location (Required)</Label>
              </div>
              
              <p className="text-sm text-blue-700">
                The seller needs your location to estimate delivery feasibility.
              </p>

              {/* GPS Location */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="w-full"
                >
                  {locationLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Getting Location...
                    </div>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      {buyerLocation ? "Update GPS Location" : "Get My GPS Location"}
                    </>
                  )}
                </Button>

                {buyerLocation && (
                  <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                    ✓ GPS Location captured: {buyerLocation.latitude.toFixed(4)}, {buyerLocation.longitude.toFixed(4)}
                    {buyerLocation.accuracy && ` (±${Math.round(buyerLocation.accuracy)}m)`}
                  </div>
                )}

                {locationError && (
                  <div className="text-sm text-red-700 bg-red-50 p-2 rounded flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {locationError}
                  </div>
                )}
              </div>

              {/* Manual Address */}
              <div>
                <Label htmlFor="locationAddress">Or Enter Your Address</Label>
                <Textarea
                  id="locationAddress"
                  placeholder="Enter your full address (street, area, city, pincode)"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  rows={2}
                />
              </div>

              {!buyerLocation && !locationAddress.trim() && (
                <p className="text-sm text-red-600">
                  Please provide either GPS location or your address.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="message">Message (Optional)</Label>
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
                {loading ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
