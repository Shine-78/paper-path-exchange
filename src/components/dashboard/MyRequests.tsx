
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { User, Book, MapPin, MessageSquare, Package, Calendar, Navigation, AlertCircle, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LeafletBookRouteMap } from "./LeafletBookRouteMap";
import { ChatModal } from "./ChatModal";
import { DeliveryConfirmationModal } from "./DeliveryConfirmationModal";

interface BuyerRequest {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  expected_delivery_date?: string;
  book_title?: string;
  book_price?: number;
  seller_name?: string;
  seller_location?: string;
  seller_latitude?: number;
  seller_longitude?: number;
  buyer_latitude?: number;
  buyer_longitude?: number;
  offered_price?: number;
  transfer_mode?: string;
  message?: string;
}

interface MyRequestsProps {
  userId?: string;
  userProfile?: any;
}

export const MyRequests = ({ userId, userProfile }: MyRequestsProps) => {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestForChat, setSelectedRequestForChat] = useState<string | null>(null);
  const [selectedRequestForDelivery, setSelectedRequestForDelivery] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMyRequests = async () => {
    if (!userId) {
      setError("User ID not provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching buyer requests for user:', userId);
      
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
          id, book_id, buyer_id, seller_id, status, created_at, expected_delivery_date,
          offered_price, transfer_mode, message,
          books (title, price_range),
          seller_profile:profiles!seller_id (full_name, location_address, latitude, longitude)
        `)
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching buyer requests:', error);
        throw error;
      }

      console.log('Fetched buyer requests data:', data);

      const enrichedRequests: BuyerRequest[] = data?.map(request => ({
        id: request.id,
        book_id: request.book_id,
        buyer_id: request.buyer_id,
        seller_id: request.seller_id,
        status: request.status as 'pending' | 'accepted' | 'rejected' | 'completed',
        created_at: request.created_at,
        expected_delivery_date: request.expected_delivery_date,
        book_title: request.books?.title,
        book_price: request.books?.price_range,
        seller_name: request.seller_profile?.full_name,
        seller_location: request.seller_profile?.location_address,
        seller_latitude: request.seller_profile?.latitude,
        seller_longitude: request.seller_profile?.longitude,
        buyer_latitude: userProfile?.latitude,
        buyer_longitude: userProfile?.longitude,
        offered_price: request.offered_price,
        transfer_mode: request.transfer_mode,
        message: request.message,
      })) || [];

      console.log('Enriched buyer requests:', enrichedRequests);
      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching buyer requests:', error);
      setError(error.message || "Failed to fetch your requests");
      toast({
        title: "Error",
        description: "Failed to fetch your purchase requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [userId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading your requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error: {error}</span>
          </div>
          <div className="mt-4 text-center">
            <Button onClick={fetchMyRequests} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Requests</h3>
            <p className="text-gray-600 mb-4">
              You haven't made any purchase requests yet. Browse books to start buying!
            </p>
            <Button onClick={fetchMyRequests} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Purchase Requests ({requests.length})</span>
            <Button onClick={fetchMyRequests} variant="outline" size="sm">
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Book & Seller</TableHead>
                  <TableHead>Location & Distance</TableHead>
                  <TableHead>Your Offer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const seller = request.seller_latitude && request.seller_longitude
                    ? { latitude: Number(request.seller_latitude), longitude: Number(request.seller_longitude) }
                    : null;
                  const buyer = request.buyer_latitude && request.buyer_longitude
                    ? { latitude: Number(request.buyer_latitude), longitude: Number(request.buyer_longitude) }
                    : null;
                  
                  const canShowMap = buyer && seller;
                  const distance = canShowMap 
                    ? calculateDistance(buyer.latitude, buyer.longitude, seller.latitude, seller.longitude)
                    : null;
                  
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{request.book_title || "Unknown Book"}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.seller_name || "Unknown Seller"}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString()}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {request.seller_location && (
                            <div className="text-sm flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 text-gray-500" />
                              <span className="text-gray-600">{request.seller_location}</span>
                            </div>
                          )}
                          {distance && (
                            <div className="text-sm flex items-center gap-1">
                              <Navigation className="h-3 w-3 text-blue-500" />
                              <span className="text-blue-600 font-medium">{distance} km away</span>
                            </div>
                          )}
                          {!request.seller_location && !seller && (
                            <div className="text-sm text-gray-400">No location provided</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-green-600">₹{request.offered_price}</div>
                          <div className="text-sm text-gray-600 capitalize">{request.transfer_mode?.replace('-', ' ')}</div>
                          {request.message && (
                            <div className="text-xs text-gray-500 italic max-w-32 truncate" title={request.message}>
                              "{request.message}"
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {request.status === 'pending' && <Badge variant="secondary">Waiting for Response</Badge>}
                        {request.status === 'accepted' && <Badge className="bg-green-100 text-green-800 border-0">Accepted</Badge>}
                        {request.status === 'rejected' && <Badge className="bg-red-100 text-red-800 border-0">Rejected</Badge>}
                        {request.status === 'completed' && <Badge className="bg-blue-100 text-blue-800 border-0">Completed</Badge>}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-2">
                          {/* Actions for Accepted/Completed Requests */}
                          {(request.status === 'accepted' || request.status === 'completed') && (
                            <div className="flex flex-wrap gap-1">
                              {/* Chat Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRequestForChat(request.id)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Chat
                              </Button>

                              {/* Delivery Confirmation (only if accepted and date is set) */}
                              {request.status === 'accepted' && request.expected_delivery_date && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRequestForDelivery(request.id)}
                                  className="bg-green-600 text-white hover:bg-green-700"
                                >
                                  <Package className="w-4 h-4 mr-1" />
                                  Confirm Receipt
                                </Button>
                              )}

                              {/* View Map */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!canShowMap}
                                    className="bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300"
                                  >
                                    <MapPin className="w-4 h-4 mr-1" />
                                    Map
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh]">
                                  <DialogHeader>
                                    <DialogTitle>Buyer & Seller Locations</DialogTitle>
                                  </DialogHeader>
                                  {canShowMap && (
                                    <div className="mt-4">
                                      <LeafletBookRouteMap
                                        buyer={buyer}
                                        seller={seller}
                                      />
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}

                          {/* Status Info */}
                          {request.expected_delivery_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Expected: {new Date(request.expected_delivery_date).toLocaleDateString()}
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="text-xs text-gray-500 mt-1">
                              Waiting for seller's response
                            </div>
                          )}

                          {request.status === 'rejected' && (
                            <div className="text-xs text-red-500 mt-1">
                              Request was declined
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Chat Modal */}
      {selectedRequestForChat && (
        <ChatModal
          isOpen={!!selectedRequestForChat}
          onClose={() => setSelectedRequestForChat(null)}
          requestId={selectedRequestForChat}
          currentUserId={userId}
        />
      )}

      {/* Delivery Confirmation Modal */}
      {selectedRequestForDelivery && (
        <DeliveryConfirmationModal
          isOpen={!!selectedRequestForDelivery}
          onClose={() => setSelectedRequestForDelivery(null)}
          purchaseRequestId={selectedRequestForDelivery}
          userType="buyer"
          bookTitle={requests.find(r => r.id === selectedRequestForDelivery)?.book_title || ""}
          bookPrice={requests.find(r => r.id === selectedRequestForDelivery)?.book_price || 0}
        />
      )}
    </div>
  );
};
