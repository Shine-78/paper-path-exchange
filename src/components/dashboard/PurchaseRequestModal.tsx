
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [offeredPrice, setOfferedPrice] = useState(book.price_range);
  const [transferMode, setTransferMode] = useState("self-transfer");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Create notification for seller
      await supabase.from("notifications").insert({
        user_id: book.seller_id,
        type: 'purchase_request',
        title: 'New Purchase Request',
        message: `Someone wants to buy your book "${book.title}" for ₹${offeredPrice}`,
        related_id: book.id,
        priority: 'normal'
      });

      toast({
        title: "Request sent!",
        description: "Your purchase request has been sent to the seller.",
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

  const availableTransferModes = book.transfer_type === "both" 
    ? ["self-transfer", "shipping"]
    : [book.transfer_type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
                    <Label htmlFor={mode} className="capitalize">
                      {mode.replace("-", " ")}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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
