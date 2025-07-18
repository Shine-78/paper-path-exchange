
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user in BookCard:', user?.id);
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error getting current user:', error);
        setCurrentUserId(null);
      }
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

  const handleRequestClick = () => {
    console.log('Request button clicked for book:', book.id);
    console.log('Current user can request:', canRequestBook);
    console.log('Book seller ID:', book.seller_id);
    console.log('Current user ID:', currentUserId);
    
    if (canRequestBook) {
      setIsRequestModalOpen(true);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow touch-manipulation">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg line-clamp-2 leading-tight">{book.title}</CardTitle>
          <p className="text-sm text-gray-600">by {book.author}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Book Image - Optimized for mobile */}
          {book.images && book.images.length > 0 ? (
            <div className="aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center">
              <img
                src={book.images[0]}
                alt={book.title}
                className="max-h-full max-w-full object-contain rounded-lg"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-green-600">₹{book.price_range}</span>
              <Badge className={getConditionColor(book.condition)}>
                {book.condition.charAt(0).toUpperCase() + book.condition.slice(1)}
              </Badge>
            </div>
            
            <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
              <span className="text-gray-600 font-medium">Transfer:</span>
              <span className="capitalize font-medium">{book.transfer_type.replace("-", " ")}</span>
            </div>
            
            {book.profiles?.full_name && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium">{book.profiles.full_name}</span>
              </div>
            )}
            
            {(book.location_address || book.profiles?.location_address) && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium">{book.location_address || book.profiles?.location_address}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 line-clamp-3">{book.description}</p>
            </div>
          )}

          {/* Seller rating - Mobile optimized */}
          {book.profiles && (
            <div className="pt-3 border-t">
              <p className="text-sm text-gray-600 mb-2 font-medium">Seller Rating:</p>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="font-medium text-gray-800">{book.profiles.full_name}</span>
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
              onClick={handleRequestClick} 
              className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 touch-manipulation"
            >
              Request to Buy
            </Button>
          ) : (
            <Button disabled className="w-full h-12 text-lg touch-manipulation">
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
