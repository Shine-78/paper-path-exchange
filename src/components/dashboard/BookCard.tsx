
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, User, MessageSquare, Package, Truck } from "lucide-react";
import { PurchaseRequestModal } from "./PurchaseRequestModal";

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
  };
}

interface BookCardProps {
  book: Book;
}

export const BookCard = ({ book }: BookCardProps) => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { toast } = useToast();

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "fair": return "bg-yellow-100 text-yellow-800";
      case "poor": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTransferIcon = (type: string) => {
    if (type.includes("self-transfer")) return <Package className="h-4 w-4" />;
    if (type.includes("shipping")) return <Truck className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              ₹{book.price_range}
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
              <span className="text-gray-400 text-sm">No image available</span>
            </div>
          )}

          {/* Book Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className={getConditionColor(book.condition)}>
                {book.condition.charAt(0).toUpperCase() + book.condition.slice(1)}
              </Badge>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                {getTransferIcon(book.transfer_type)}
                <span>{book.transfer_type.replace("-", " ")}</span>
              </div>
            </div>

            {book.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{book.description}</p>
            )}

            {/* Seller Info */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{book.profiles?.full_name || "Anonymous"}</span>
            </div>

            {book.profiles?.location_address && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{book.profiles.location_address}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            onClick={() => setShowPurchaseModal(true)}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Request
          </Button>
        </CardContent>
      </Card>

      <PurchaseRequestModal
        book={book}
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </>
  );
};
