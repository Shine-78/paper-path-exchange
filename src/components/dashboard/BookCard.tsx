
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, User } from "lucide-react";
import { PurchaseRequestModal } from "./PurchaseRequestModal";
import { UserRating } from "./UserRating";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
  author: string;
  condition: string;
  price_range: number;
  transfer_type: string;
  description?: string;
  location_address?: string;
  images: string[];
  seller_id: string;
  profiles?: {
    full_name: string;
    location_address: string;
    average_rating: number;
    review_count: number;
  };
}

interface BookCardProps {
  book: Book;
  onRequestPurchase?: (book: Book) => void;
}

export const BookCard = ({ book, onRequestPurchase }: BookCardProps) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user properly
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    
    getCurrentUser();
  }, []);

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "fair": return "bg-yellow-100 text-yellow-800";
      case "poor": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canRequestBook = currentUserId && currentUserId !== book.seller_id;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
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
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-600">₹{book.price_range}</span>
              <Badge className={getConditionColor(book.condition)}>
                {book.condition.charAt(0).toUpperCase() + book.condition.slice(1)}
              </Badge>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transfer:</span>
              <span className="capitalize">{book.transfer_type.replace("-", " ")}</span>
            </div>
            
            {book.profiles?.full_name && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                <span>{book.profiles.full_name}</span>
              </div>
            )}
            
            {(book.location_address || book.profiles?.location_address) && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{book.location_address || book.profiles?.location_address}</span>
              </div>
            )}
          </div>

          {book.description && (
            <p className="text-sm text-gray-700 line-clamp-3">{book.description}</p>
          )}

          {/* Add seller rating */}
          {book.profiles && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 mb-1">Seller:</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{book.profiles.full_name}</span>
                <UserRating 
                  rating={book.profiles.average_rating || 0} 
                  reviewCount={book.profiles.review_count || 0} 
                  size="sm"
                />
              </div>
            </div>
          )}

          {canRequestBook ? (
            <Button 
              onClick={() => setIsRequestModalOpen(true)} 
              className="w-full"
            >
              Request to Buy
            </Button>
          ) : (
            <Button disabled className="w-full">
              {currentUserId === book.seller_id ? "Your Book" : "Login to Request"}
            </Button>
          )}
        </CardContent>
      </Card>

      {canRequestBook && (
        <PurchaseRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          book={book}
        />
      )}
    </>
  );
};
