import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Package, AlertTriangle, Calendar } from "lucide-react";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { RefundSystem } from "./RefundSystem";

interface DeliveryConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequestId: string;
  userType: 'buyer' | 'seller';
  bookTitle: string;
  bookPrice: number;
}

interface DeliveryConfirmation {
  id: string;
  otp_verified_at: string | null;
  buyer_confirmed_delivery: boolean;
  seller_confirmed_delivery: boolean;
  buyer_confirmed_payment: boolean;
  seller_confirmed_payment: boolean;
  payment_method: string | null;
  final_payout_processed: boolean;
  expected_delivery_date: string | null;
}

export const DeliveryConfirmationModal = ({
  isOpen,
  onClose,
  purchaseRequestId,
  userType,
  bookTitle,
  bookPrice
}: DeliveryConfirmationModalProps) => {
  const [otpCode, setOtpCode] = useState("");
  const [confirmation, setConfirmation] = useState<DeliveryConfirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showRefundSystem, setShowRefundSystem] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfirmation = async () => {
    try {
      // First get the expected delivery date from purchase request
      const { data: purchaseRequest, error: prError } = await supabase
        .from('purchase_requests')
        .select('expected_delivery_date')
        .eq('id', purchaseRequestId)
        .single();

      if (prError) throw prError;
      setExpectedDeliveryDate(purchaseRequest?.expected_delivery_date || null);

      const { data, error } = await supabase
        .from('delivery_confirmations')
        .select('*')
        .eq('purchase_request_id', purchaseRequestId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfirmation(data);
    } catch (error: any) {
      console.error('Error fetching confirmation:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfirmation();
    }
  }, [isOpen, purchaseRequestId]);

  const sendOTP = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-delivery-otp', {
        body: { purchaseRequestId }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Delivery OTP has been sent to your email and notifications.",
      });

      fetchConfirmation();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-delivery-otp', {
        body: { purchaseRequestId, otpCode }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery confirmed successfully!",
      });

      setOtpCode("");
      fetchConfirmation();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = async (paymentMethod: string) => {
    setLoading(true);
    try {
      if (paymentMethod === 'stripe') {
        const { data, error } = await supabase.functions.invoke('create-book-payment', {
          body: { 
            purchaseRequestId, 
            amount: bookPrice 
          }
        });

        if (error) throw error;

        if (data.url) {
          window.open(data.url, '_blank');
          
          await supabase.functions.invoke('process-final-payment', {
            body: { 
              purchaseRequestId, 
              buyerConfirmed: true, 
              paymentMethod: 'stripe' 
            }
          });

          fetchConfirmation();
          setShowPaymentSelector(false);
        }
      } else {
        // Handle other payment methods
        await supabase.functions.invoke('process-final-payment', {
          body: { 
            purchaseRequestId, 
            buyerConfirmed: true, 
            paymentMethod 
          }
        });

        toast({
          title: "Payment Confirmed",
          description: `Payment confirmed via ${paymentMethod}`,
        });

        fetchConfirmation();
        setShowPaymentSelector(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentMethod: string) => {
    setLoading(true);
    try {
      const updates = userType === 'buyer' 
        ? { buyerConfirmed: true, paymentMethod }
        : { sellerConfirmed: true };

      const { data, error } = await supabase.functions.invoke('process-final-payment', {
        body: { purchaseRequestId, ...updates }
      });

      if (error) throw error;

      // If seller is confirming payment, decrease book quantity
      if (userType === 'seller' && !confirmation?.seller_confirmed_delivery) {
        // Get the book ID from the purchase request
        const { data: purchaseRequest, error: prError } = await supabase
          .from('purchase_requests')
          .select('book_id')
          .eq('id', purchaseRequestId)
          .single();

        if (prError) {
          console.error('Error fetching purchase request:', prError);
        } else if (purchaseRequest?.book_id) {
          // Get current book quantity
          const { data: book, error: bookError } = await supabase
            .from('books')
            .select('quantity')
            .eq('id', purchaseRequest.book_id)
            .single();

          if (bookError) {
            console.error('Error fetching book:', bookError);
          } else if (book && book.quantity > 0) {
            // Decrease quantity by 1
            const newQuantity = book.quantity - 1;
            const { error: updateError } = await supabase
              .from('books')
              .update({ 
                quantity: newQuantity,
                status: newQuantity === 0 ? 'sold' : 'available'
              })
              .eq('id', purchaseRequest.book_id);

            if (updateError) {
              console.error('Error updating book quantity:', updateError);
            } else {
              console.log(`Book quantity decreased to ${newQuantity}`);
            }
          }
        }
      }

      toast({
        title: "Success",
        description: `Payment ${userType === 'buyer' ? 'confirmed' : 'acknowledged'} successfully!`,
      });

      fetchConfirmation();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (step: number) => {
    if (!confirmation) return 'pending';
    
    switch (step) {
      case 1:
        return confirmation.otp_verified_at ? 'completed' : 'pending';
      case 2:
        return confirmation.buyer_confirmed_delivery && confirmation.seller_confirmed_delivery ? 'completed' : 'pending';
      case 3:
        return confirmation.buyer_confirmed_payment && confirmation.seller_confirmed_payment ? 'completed' : 'pending';
      case 4:
        return confirmation.final_payout_processed ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const formatDeliveryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery Confirmation</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <h3 className="font-semibold">{bookTitle}</h3>
              <p className="text-sm text-gray-600">Price: ₹{bookPrice}</p>
              
              {/* Show expected delivery date */}
              {expectedDeliveryDate && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Expected Delivery: {formatDeliveryDate(expectedDeliveryDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Step 1: OTP Verification */}
              <div className="flex items-start space-x-3">
                <StatusIcon status={getStepStatus(1)} />
                <div className="flex-1">
                  <h4 className="font-medium">1. Delivery OTP Verification</h4>
                  <p className="text-sm text-gray-600">Buyer confirms receipt with OTP</p>
                  
                  {userType === 'buyer' && !confirmation?.otp_verified_at && (
                    <div className="mt-2 space-y-2">
                      {!confirmation ? (
                        <Button size="sm" onClick={sendOTP} disabled={sending}>
                          {sending ? "Sending..." : "Get OTP"}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="otp">Enter OTP (Check Email)</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="otp"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="6-digit OTP"
                              maxLength={6}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={verifyOTP} disabled={loading || otpCode.length !== 6}>
                              Verify
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="link"
                            onClick={sendOTP}
                            disabled={sending}
                            className="p-0 h-auto"
                          >
                            {sending ? "Sending..." : "Resend OTP"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Step 2: Delivery Confirmation */}
              <div className="flex items-start space-x-3">
                <StatusIcon status={getStepStatus(2)} />
                <div className="flex-1">
                  <h4 className="font-medium">2. Delivery Confirmation</h4>
                  <p className="text-sm text-gray-600">Both parties confirm delivery</p>
                  
                  {confirmation?.otp_verified_at && (
                    <div className="mt-2 space-y-1">
                      <Badge variant={confirmation.buyer_confirmed_delivery ? "default" : "secondary"}>
                        Buyer: {confirmation.buyer_confirmed_delivery ? "Confirmed" : "Pending"}
                      </Badge>
                      <Badge variant={confirmation.seller_confirmed_delivery ? "default" : "secondary"}>
                        Seller: {confirmation.seller_confirmed_delivery ? "Confirmed" : "Pending"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Step 3: Payment */}
              <div className="flex items-start space-x-3">
                <StatusIcon status={getStepStatus(3)} />
                <div className="flex-1">
                  <h4 className="font-medium">3. Payment</h4>
                  <p className="text-sm text-gray-600">Complete payment to seller</p>
                  
                  {confirmation?.otp_verified_at && (
                    <div className="mt-2 space-y-2">
                      {userType === 'buyer' && !confirmation.buyer_confirmed_payment && (
                        <div className="space-y-2">
                          <Button 
                            size="sm" 
                            onClick={() => setShowPaymentSelector(true)} 
                            disabled={loading}
                            className="w-full"
                          >
                            Choose Payment Method
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => confirmPayment('other')} 
                            disabled={loading}
                            className="w-full"
                          >
                            Paid Outside App
                          </Button>
                        </div>
                      )}
                      
                      {userType === 'seller' && confirmation.buyer_confirmed_payment && !confirmation.seller_confirmed_payment && (
                        <Button size="sm" onClick={() => confirmPayment('confirmed')} disabled={loading}>
                          <Package className="h-4 w-4 mr-1" />
                          Confirm Payment Received
                        </Button>
                      )}
                      
                      <div className="space-y-1">
                        <Badge variant={confirmation.buyer_confirmed_payment ? "default" : "secondary"}>
                          Buyer Payment: {confirmation.buyer_confirmed_payment ? "Confirmed" : "Pending"}
                        </Badge>
                        <Badge variant={confirmation.seller_confirmed_payment ? "default" : "secondary"}>
                          Seller Confirmation: {confirmation.seller_confirmed_payment ? "Confirmed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Step 4: Final Payout */}
              <div className="flex items-start space-x-3">
                <StatusIcon status={getStepStatus(4)} />
                <div className="flex-1">
                  <h4 className="font-medium">4. Final Payout</h4>
                  <p className="text-sm text-gray-600">
                    Seller receives ₹{bookPrice + 30} (₹{bookPrice} + ₹30 BookEx bonus)
                  </p>
                  
                  {confirmation?.final_payout_processed && (
                    <Badge className="mt-2">Completed</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Refund Option for Buyers */}
            {userType === 'buyer' && confirmation?.buyer_confirmed_payment && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Issue with your order?</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowRefundSystem(true)}
                  className="w-full"
                >
                  Request Refund
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Selector Modal */}
      <Dialog open={showPaymentSelector} onOpenChange={setShowPaymentSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <PaymentMethodSelector
            onPaymentMethodSelect={handlePaymentMethodSelect}
            loading={loading}
            amount={bookPrice}
          />
        </DialogContent>
      </Dialog>

      {/* Refund System Modal */}
      <RefundSystem
        isOpen={showRefundSystem}
        onClose={() => setShowRefundSystem(false)}
        purchaseRequestId={purchaseRequestId}
        bookTitle={bookTitle}
        amount={bookPrice}
      />
    </>
  );
};
