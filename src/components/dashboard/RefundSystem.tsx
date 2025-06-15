
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, DollarSign } from "lucide-react";

interface RefundSystemProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequestId: string;
  bookTitle: string;
  amount: number;
}

export const RefundSystem = ({ 
  isOpen, 
  onClose, 
  purchaseRequestId, 
  bookTitle, 
  amount 
}: RefundSystemProps) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refundReasons = [
    "Item not as described",
    "Item damaged during delivery",
    "Wrong item received",
    "Seller cancelled order",
    "Quality issues",
    "Other"
  ];

  const handleRefundRequest = async () => {
    if (!reason || (reason === "Other" && !customReason.trim())) {
      toast({
        title: "Error",
        description: "Please select a reason for the refund",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create refund request notification using 'general' type instead of 'refund_request'
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id, // This would go to admin in real implementation
        type: 'general', // Using 'general' type which should be allowed by the constraint
        title: 'Refund Request',
        message: `Refund requested for "${bookTitle}" - Amount: ₹${amount} - Reason: ${reason === "Other" ? customReason : reason}`,
        related_id: purchaseRequestId,
        priority: 'high'
      });

      if (error) throw error;

      toast({
        title: "Refund Requested",
        description: "Your refund request has been submitted. We'll review it within 24 hours.",
      });

      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Request Refund</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2 text-orange-600 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Refund Details</span>
              </div>
              <p className="text-sm"><strong>Book:</strong> {bookTitle}</p>
              <p className="text-sm"><strong>Amount:</strong> ₹{amount}</p>
            </CardContent>
          </Card>

          <div>
            <Label>Reason for refund</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {refundReasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="text-sm">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {reason === "Other" && (
            <div>
              <Label htmlFor="customReason">Please specify</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please describe the issue..."
                rows={3}
              />
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Refund Policy:</strong> Refunds are processed within 5-7 business days after approval. 
              You'll receive the refund to your original payment method.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleRefundRequest} disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
