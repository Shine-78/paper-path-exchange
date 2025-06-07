
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Package, CreditCard } from "lucide-react";

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
  const { toast } = useToast();

  const fetchConfirmation = async () => {
    try {
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
        description: "Delivery OTP has been sent to your notifications.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delivery Confirmation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-semibold">{bookTitle}</h3>
            <p className="text-sm text-gray-600">Price: ₹{bookPrice}</p>
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
                        <Label htmlFor="otp">Enter OTP</Label>
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

            {/* Step 3: Payment Confirmation */}
            <div className="flex items-start space-x-3">
              <StatusIcon status={getStepStatus(3)} />
              <div className="flex-1">
                <h4 className="font-medium">3. Payment Confirmation</h4>
                <p className="text-sm text-gray-600">Confirm payment method and completion</p>
                
                {confirmation?.otp_verified_at && (
                  <div className="mt-2 space-y-2">
                    {userType === 'buyer' && !confirmation.buyer_confirmed_payment && (
                      <div className="space-y-2">
                        <p className="text-sm">Choose payment method:</p>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => confirmPayment('stripe')} disabled={loading}>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay via Stripe
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => confirmPayment('other')} 
                            disabled={loading}
                          >
                            Paid Other Way
                          </Button>
                        </div>
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

          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
