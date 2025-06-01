
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Library, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  condition: string;
  price_range: number;
  transfer_type: string;
  description?: string;
  status: string;
  listing_paid: boolean;
  created_at: string;
  images: string[];
}

export const MyBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMyBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch your books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBooks();
  }, []);

  const toggleBookStatus = async (bookId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "available" ? "inactive" : "available";
      
      const { error } = await supabase
        .from("books")
        .update({ status: newStatus })
        .eq("id", bookId);

      if (error) throw error;

      setBooks(books.map(book => 
        book.id === bookId ? { ...book, status: newStatus } : book
      ));

      toast({
        title: "Success",
        description: `Book ${newStatus === "available" ? "activated" : "deactivated"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBook = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", bookId);

      if (error) throw error;

      setBooks(books.filter(book => book.id !== bookId));
      toast({
        title: "Success",
        description: "Book deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string, listingPaid: boolean) => {
    if (!listingPaid) return "bg-orange-100 text-orange-800";
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "pending": return "bg-blue-100 text-blue-800";
      case "sold": return "bg-purple-100 text-purple-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string, listingPaid: boolean) => {
    if (!listingPaid) return "Payment Pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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
            <Library className="h-5 w-5" />
            <span>My Books ({books.length})</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {books.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Library className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No books listed yet</h3>
            <p className="text-gray-600">Start by listing your first book for sale.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                  <Badge className={getStatusColor(book.status, book.listing_paid)}>
                    {getStatusText(book.status, book.listing_paid)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">by {book.author}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Book Image */}
                {book.images && book.images.length > 0 ? (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <img
                      src={book.images[0]}
                      alt={book.title}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold">₹{book.price_range}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Condition:</span>
                    <span className="capitalize">{book.condition}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transfer:</span>
                    <span className="capitalize">{book.transfer_type.replace("-", " ")}</span>
                  </div>
                </div>

                {!book.listing_paid && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm text-orange-800">
                      Complete payment (₹50) to activate this listing
                    </p>
                    <Button size="sm" className="mt-2 w-full">
                      Pay Now
                    </Button>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleBookStatus(book.id, book.status)}
                    className="flex-1"
                    disabled={!book.listing_paid}
                  >
                    {book.status === "available" ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteBook(book.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
