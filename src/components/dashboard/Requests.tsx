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
import { CheckCircle, Circle, User, Book, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookRouteMap } from "./BookRouteMap";
import { LeafletBookRouteMap } from "./LeafletBookRouteMap";

interface PurchaseRequest {
  id: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  book_title?: string;
  book_price?: number;
  buyer_name?: string;
  buyer_location?: string;
  buyer_latitude?: number;
  buyer_longitude?: number;
  seller_latitude?: number;
  seller_longitude?: number;
}

export const Requests = (props) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
          id, book_id, buyer_id, seller_id, status, created_at,
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
        book_title: request.books?.title,
        book_price: request.books?.price_range,
        buyer_name: request.buyer_profile?.full_name,
        buyer_location: request.buyer_profile?.location_address,
        buyer_latitude: request.buyer_profile?.latitude,
        buyer_longitude: request.buyer_profile?.longitude,
        seller_latitude: props.userProfile?.latitude,
        seller_longitude: props.userProfile?.longitude,
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
        description: "Request accepted successfully",
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
                    <TableHead className="w-[150px]">Book</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Date</TableHead>
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
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.book_title}</TableCell>
                        <TableCell>{request.buyer_name}</TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {request.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                          {request.status === 'accepted' && <Badge className="bg-green-100 text-green-800 border-0">Accepted</Badge>}
                          {request.status === 'rejected' && <Badge className="bg-red-100 text-red-800 border-0">Rejected</Badge>}
                          {request.status === 'completed' && <Badge className="bg-blue-100 text-blue-800 border-0">Completed</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-2">
                            {request.status === 'pending' && (
                              <div className="space-x-2">
                                <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>Accept</Button>
                                <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                              </div>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canShowMap}
                                  className="bg-purple-600 text-white hover:bg-purple-700"
                                >
                                  <MapPin className="w-4 h-4 mr-2" />
                                  View Map
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
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
    </div>
  );
}
