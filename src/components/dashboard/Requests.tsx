
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
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, User, Book, MapPin, MessageSquare, Package, Calendar, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookRouteMap } from "./BookRouteMap";
import { LeafletBookRouteMap } from "./LeafletBookRouteMap";
import { ChatModal } from "./ChatModal";
import { DeliveryConfirmationModal } from "./DeliveryConfirmationModal";
import { DeliveryDateSelector } from "./DeliveryDateSelector";

interface PurchaseRequest {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  expected_delivery_date?: string;
  book_title?: string;
  book_price?: number;
  buyer_name?: string;
  buyer_location?: string;
  buyer_latitude?: number;
  buyer_longitude?: number;
  seller_latitude?: number;
  seller_longitude?: number;
  offered_price?: number;
  transfer_mode?: string;
  message?: string;
}

export const Requests = (props) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestForChat, setSelectedRequestForChat] = useState<string | null>(null);
  const [selectedRequestForDelivery, setSelectedRequestForDelivery] = useState<string | null>(null);
  const [selectedRequestForDate, setSelectedRequestForDate] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
          id, book_id, buyer_id, seller_id, status, created_at, expected_delivery_date,
          offered_price, transfer_mode, message,
          books (title, price_range),
          buyer_profile:profiles!buyer_id (full_name, location_address, latitude, longitude)
        `)
        .eq("seller_id", props.userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedRequests: PurchaseRequest[] = data.map(request => ({
        id: request.id,
        book_id: request.book_id,
        buyer_id: request.buyer_id,
        seller_id: request.seller_id,
        status: request.status as 'pending' | 'accepted' | 'rejected' | 'completed',
        created_at: request.created_at,
        expected_delivery_date: request.expected_delivery_date,
        book_title: request.books?.title,
        book_price: request.books?.price_range,
        buyer_name: request.buyer_profile?.full_name,
        buyer_location: request.buyer_profile?.location_address,
        buyer_latitude: request.buyer_profile?.latitude,
        buyer_longitude: request.buyer_profile?.longitude,
        seller_latitude: props.userProfile?.latitude,
        seller_longitude: props.userProfile?.longitude,
        offered_price: request.offered_price,
        transfer_mode: request.transfer_mode,
        message: request.message,
      }));

      setRequests(enrichedRequests);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch purchase requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request accepted successfully. You can now set delivery date and coordinate with the buyer.",
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "You have rejected the purchase request.",
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  const handleDeliveryDateSet = async (requestId: string, date: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ expected_delivery_date: date })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery date set successfully",
      });
      
      setSelectedRequestForDate(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to set delivery date",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Book & Buyer</TableHead>
                    <TableHead>Location & Distance</TableHead>
                    <TableHead>Offer Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const buyer = request.buyer_latitude && request.buyer_longitude
                      ? { latitude: Number(request.buyer_latitude), longitude: Number(request.buyer_longitude) }
                      : null;
                    const seller = request.seller_latitude && request.seller_longitude
                      ? { latitude: Number(request.seller_latitude), longitude: Number(request.seller_longitude) }
                      : null;
                    
                    const canShowMap = buyer && seller;
                    const distance = canShowMap 
                      ? calculateDistance(buyer.latitude, buyer.longitude, seller.latitude, seller.longitude)
                      : null;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{request.book_title}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {request.buyer_name}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString()}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            {request.buyer_location && (
                              <div className="text-sm flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 text-gray-500" />
                                <span className="text-gray-600">{request.buyer_location}</span>
                              </div>
                            )}
                            {distance && (
                              <div className="text-sm flex items-center gap-1">
                                <Navigation className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-600 font-medium">{distance} km away</span>
                              </div>
                            )}
                            {!request.buyer_location && !buyer && (
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
                          {request.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                          {request.status === 'accepted' && <Badge className="bg-green-100 text-green-800 border-0">Accepted</Badge>}
                          {request.status === 'rejected' && <Badge className="bg-red-100 text-red-800 border-0">Rejected</Badge>}
                          {request.status === 'completed' && <Badge className="bg-blue-100 text-blue-800 border-0">Completed</Badge>}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-2">
                            {/* Primary Actions for Pending Requests */}
                            {request.status === 'pending' && (
                              <div className="space-x-2">
                                <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>Accept</Button>
                                <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                              </div>
                            )}

                            {/* Secondary Actions for Accepted/Completed Requests */}
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

                                {/* Set Delivery Date (only if accepted and no date set) */}
                                {request.status === 'accepted' && !request.expected_delivery_date && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedRequestForDate(request.id)}
                                    className="bg-orange-600 text-white hover:bg-orange-700"
                                  >
                                    <Calendar className="w-4 h-4 mr-1" />
                                    Set Date
                                  </Button>
                                )}

                                {/* Delivery Confirmation (only if accepted and date is set) */}
                                {request.status === 'accepted' && request.expected_delivery_date && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedRequestForDelivery(request.id)}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                  >
                                    <Package className="w-4 h-4 mr-1" />
                                    Delivery
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
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Modal */}
      {selectedRequestForChat && (
        <ChatModal
          isOpen={!!selectedRequestForChat}
          onClose={() => setSelectedRequestForChat(null)}
          requestId={selectedRequestForChat}
          currentUserId={props.userId}
        />
      )}

      {/* Delivery Confirmation Modal */}
      {selectedRequestForDelivery && (
        <DeliveryConfirmationModal
          isOpen={!!selectedRequestForDelivery}
          onClose={() => setSelectedRequestForDelivery(null)}
          purchaseRequestId={selectedRequestForDelivery}
          userType="seller"
          bookTitle={requests.find(r => r.id === selectedRequestForDelivery)?.book_title || ""}
          bookPrice={requests.find(r => r.id === selectedRequestForDelivery)?.book_price || 0}
        />
      )}

      {/* Delivery Date Selector Modal */}
      {selectedRequestForDate && (
        <Dialog open={!!selectedRequestForDate} onOpenChange={() => setSelectedRequestForDate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Set Expected Delivery Date</DialogTitle>
            </DialogHeader>
            <DeliveryDateSelector
              onDateSelect={(date) => handleDeliveryDateSet(selectedRequestForDate, date)}
              onCancel={() => setSelectedRequestForDate(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
