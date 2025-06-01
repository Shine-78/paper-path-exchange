
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  const sessionId = searchParams.get('session_id');
  const bookId = searchParams.get('book_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !bookId) {
        toast({
          title: "Error",
          description: "Missing payment information",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId, bookId }
        });

        if (error) throw error;

        if (data.success) {
          setVerified(true);
          toast({
            title: "Payment Successful!",
            description: "Your book listing has been activated.",
          });
        } else {
          throw new Error(data.message || "Payment verification failed");
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, bookId, navigate, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Verifying Payment...</h3>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span>Payment Successful!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verified ? (
            <>
              <p className="text-gray-600">
                Your security deposit of ₹100 has been processed successfully.
              </p>
              <p className="text-gray-600">
                Your book listing is now active and visible to buyers.
              </p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Remember:</strong> When your book sells, you'll receive:
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Book Price + ₹100 Security Deposit - ₹20 Platform Fee
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-600">
              There was an issue verifying your payment. Please contact support.
            </p>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => navigate('/my-books')}
              className="flex-1"
            >
              View My Books
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
