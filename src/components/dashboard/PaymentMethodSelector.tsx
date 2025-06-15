
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Smartphone, Wallet, University } from "lucide-react";

interface PaymentMethodSelectorProps {
  onPaymentMethodSelect: (method: string) => void;
  loading: boolean;
  amount: number;
}

export const PaymentMethodSelector = ({ onPaymentMethodSelect, loading, amount }: PaymentMethodSelectorProps) => {
  const [selectedMethod, setSelectedMethod] = useState("stripe");

  const paymentMethods = [
    {
      id: "stripe",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Secure payment via Stripe"
    },
    {
      id: "upi",
      name: "UPI Payment",
      icon: Smartphone,
      description: "Pay using UPI apps like GPay, PhonePe"
    },
    {
      id: "wallet",
      name: "Digital Wallet",
      icon: Wallet,
      description: "Use your digital wallet balance"
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      icon: University,
      description: "Direct bank account transfer"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Payment Method</CardTitle>
        <p className="text-sm text-gray-600">Amount: ₹{amount}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={method.id} id={method.id} />
                <Icon className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <Label htmlFor={method.id} className="font-medium cursor-pointer">
                    {method.name}
                  </Label>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        <Button 
          onClick={() => onPaymentMethodSelect(selectedMethod)} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Processing..." : `Pay ₹${amount}`}
        </Button>
      </CardContent>
    </Card>
  );
};
