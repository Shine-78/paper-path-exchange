import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Check, X, Clock, Package } from "lucide-react";
import { ChatModal } from "./ChatModal";
import { ReviewModal } from "./ReviewModal";
import { DeliveryConfirmationModal } from "./DeliveryConfirmationModal";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface PurchaseRequest {
  id: string;
  offered_price: number;
  transfer_mode: string;
  message?: string;
  status: string;
  created_at: string;
  buyer_id?: string;
  seller_id?: string;
  books: {
    title: string;
    author: string;
    price_range: number;
  };
  buyer_profiles?: {
    full_name: string;
  };
  seller_profiles?: {
    full_name: string;
  };
}

export const Requests = () => {
  const [sentRequests, setSentRequests] = useState<PurchaseRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedChatRequest, setSelectedChatRequest] = useState<string | null>(null);
  const [selectedReviewRequest, setSelectedReviewRequest] = useState<{
    requestId: string;
    reviewedUserId: string;
    reviewedUserName: string;
    bookTitle: string;
    reviewType: 'buyer_to_seller' | 'seller_to_buyer';
  } | null>(null);
  const [selectedDeliveryRequest, setSelectedDeliveryRequest] = useState<{
    requestId: string;
    userType: 'buyer' | 'seller';
    bookTitle: string;
    bookPrice: number;
  } | null>(null);
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      setCurrentUserId(user.id);

      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from("purchase_requests")
        .select(`
          *,
          books!inner (title, author, price_range),
          seller_profiles:profiles!purchase_requests_seller_id_fkey (full_name)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Fetch received requests
      const { data: received, error: receivedError } = await supabase
        .from("purchase_requests")
        .select(`
          *,
          books!inner (title, author, price_range),
          buyer_profiles:profiles!purchase_requests_buyer_id_fkey (full_name)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      setSentRequests(sent || []);
      setReceivedRequests(received || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('requests_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchase_requests'
      }, (payload) => {
        playNotificationSound(); // Play sound on any request update (book/delivery)
        fetchRequests();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        playNotificationSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("purchase_requests")
        .update({ status })
        .eq("id", requestId);

      if (error) throw error;

      setReceivedRequests(requests =>
        requests.map(req => 
          req.id === requestId ? { ...req, status } : req
        )
      );

      toast({
        title: "Success",
        description: `Request ${status}`,
      });

      playNotificationSound();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const RequestCard = ({ request, type }: { request: PurchaseRequest; type: "sent" | "received" }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{request.books.title}</CardTitle>
          <Badge className={getStatusColor(request.status)}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">by {request.books.author}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Listed Price:</span>
            <span>₹{request.books.price_range}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Offered Price:</span>
            <span className="font-semibold">₹{request.offered_price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Transfer Mode:</span>
            <span className="capitalize">{request.transfer_mode.replace("-", " ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {type === "sent" ? "Seller:" : "Buyer:"}
            </span>
            <span>
              {type === "sent" 
                ? request.seller_profiles?.full_name || "Unknown"
                : request.buyer_profiles?.full_name || "Unknown"
              }
            </span>
          </div>
        </div>

        {request.message && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">{request.message}</p>
          </div>
        )}

        {type === "received" && request.status === "pending" && (
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => updateRequestStatus(request.id, "accepted")}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateRequestStatus(request.id, "rejected")}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {request.status === "accepted" && (
          <div className="bg-green-50 p-3 rounded-lg space-y-2">
            <p className="text-sm text-green-800">
              Request accepted! Arrange delivery and use the delivery confirmation system.
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => setSelectedDeliveryRequest({
                requestId: request.id,
                userType: type === "sent" ? "buyer" : "seller",
                bookTitle: request.books.title,
                bookPrice: request.offered_price
              })}
            >
              <Package className="h-4 w-4 mr-1" />
              Delivery Confirmation
            </Button>
          </div>
        )}

        {request.status === "completed" && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800 mb-2">
              Transaction completed successfully!
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => setSelectedReviewRequest({
                requestId: request.id,
                reviewedUserId: type === "sent" ? request.seller_id! : request.buyer_id!,
                reviewedUserName: type === "sent" ? request.seller_profiles?.full_name || "Seller" : request.buyer_profiles?.full_name || "Buyer",
                bookTitle: request.books.title,
                reviewType: type === "sent" ? "buyer_to_seller" : "seller_to_buyer"
              })}
            >
              Leave Review
            </Button>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-500">
          <span>{new Date(request.created_at).toLocaleDateString()}</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedChatRequest(request.id)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Purchase Requests</span>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Received ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="space-y-4">
          {receivedRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests received</h3>
                <p className="text-gray-600">When someone wants to buy your books, their requests will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {receivedRequests.map((request) => (
                <RequestCard key={request.id} request={request} type="received" />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="space-y-4">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests sent</h3>
                <p className="text-gray-600">When you request to buy books, they'll appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sentRequests.map((request) => (
                <RequestCard key={request.id} request={request} type="sent" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedChatRequest && currentUserId && (
        <ChatModal
          isOpen={!!selectedChatRequest}
          onClose={() => setSelectedChatRequest(null)}
          requestId={selectedChatRequest}
          currentUserId={currentUserId}
        />
      )}

      {selectedReviewRequest && (
        <ReviewModal
          isOpen={!!selectedReviewRequest}
          onClose={() => setSelectedReviewRequest(null)}
          purchaseRequestId={selectedReviewRequest.requestId}
          reviewedUserId={selectedReviewRequest.reviewedUserId}
          reviewedUserName={selectedReviewRequest.reviewedUserName}
          bookTitle={selectedReviewRequest.bookTitle}
          reviewType={selectedReviewRequest.reviewType}
          onReviewSubmitted={() => {
            setSelectedReviewRequest(null);
            fetchRequests();
          }}
        />
      )}

      {selectedDeliveryRequest && (
        <DeliveryConfirmationModal
          isOpen={!!selectedDeliveryRequest}
          onClose={() => setSelectedDeliveryRequest(null)}
          purchaseRequestId={selectedDeliveryRequest.requestId}
          userType={selectedDeliveryRequest.userType}
          bookTitle={selectedDeliveryRequest.bookTitle}
          bookPrice={selectedDeliveryRequest.bookPrice}
        />
      )}
    </div>
  );
};
