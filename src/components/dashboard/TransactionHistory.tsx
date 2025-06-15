
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpIcon, ArrowDownIcon, RefreshCw, Download } from "lucide-react";

interface Transaction {
  id: string;
  type: 'payment' | 'payout' | 'refund' | 'security_deposit';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  created_at: string;
  book_title?: string;
  other_party?: string;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // This would be a more complex query in real implementation
      // For now, we'll create mock transaction data based on purchase requests
      const { data: requests, error } = await supabase
        .from("purchase_requests")
        .select(`
          *,
          books!inner(title),
          buyer_profiles:profiles!purchase_requests_buyer_id_fkey(full_name),
          seller_profiles:profiles!purchase_requests_seller_id_fkey(full_name)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Convert purchase requests to transaction format
      const mockTransactions: Transaction[] = [];
      
      requests?.forEach(request => {
        const isBuyer = request.buyer_id === user.id;
        const otherParty = isBuyer ? request.seller_profiles?.full_name : request.buyer_profiles?.full_name;

        if (isBuyer) {
          // Payment made by buyer
          mockTransactions.push({
            id: `payment-${request.id}`,
            type: 'payment',
            amount: request.offered_price,
            status: 'completed',
            description: `Payment for "${request.books.title}"`,
            created_at: request.created_at,
            book_title: request.books.title,
            other_party: otherParty || 'Unknown'
          });
        } else {
          // Payout received by seller
          mockTransactions.push({
            id: `payout-${request.id}`,
            type: 'payout',
            amount: request.offered_price + 30, // Including BookEx bonus
            status: 'completed',
            description: `Sale of "${request.books.title}"`,
            created_at: request.created_at,
            book_title: request.books.title,
            other_party: otherParty || 'Unknown'
          });
        }
      });

      setTransactions(mockTransactions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const downloadTransactionHistory = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Status', 'Description', 'Other Party'].join(','),
      ...transactions.map(tx => [
        new Date(tx.created_at).toLocaleDateString(),
        tx.type,
        tx.amount,
        tx.status,
        `"${tx.description}"`,
        tx.other_party || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookex-transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
      case 'payout':
        return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
      case 'refund':
        return <ArrowDownIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTransactionHistory}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString()} • {transaction.other_party}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {transaction.type === 'payment' ? '-' : '+'}₹{transaction.amount}
                  </p>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
