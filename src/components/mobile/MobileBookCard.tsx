
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TouchHandler } from "./TouchHandler";
import { BookOpen, MapPin, Heart, Share } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  price_range: number;
  condition: string;
  location_address?: string;
  images?: string[];
  description?: string;
}

interface MobileBookCardProps {
  book: Book;
  onInterest: (bookId: string) => void;
  onShare?: (bookId: string) => void;
  onViewDetails: (bookId: string) => void;
}

export const MobileBookCard = ({ book, onInterest, onShare, onViewDetails }: MobileBookCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleSwipeLeft = () => {
    // Swipe left to like/save
    setIsLiked(!isLiked);
  };

  const handleSwipeRight = () => {
    // Swipe right to show more actions
    setShowActions(!showActions);
  };

  const handleTap = () => {
    onViewDetails(book.id);
  };

  const handleShare = async () => {
    if (navigator.share && onShare) {
      try {
        await navigator.share({
          title: `${book.title} by ${book.author}`,
          text: `Check out this book for ₹${book.price_range}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
        onShare(book.id);
      }
    } else if (onShare) {
      onShare(book.id);
    }
  };

  return (
    <TouchHandler
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      className="w-full"
    >
      <Card 
        className={`border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
          isLiked ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
        }`}
        onClick={handleTap}
      >
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-xl flex items-center justify-center overflow-hidden">
            {book.images && book.images.length > 0 ? (
              <img 
                src={book.images[0]} 
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-16 w-16 text-gray-400" />
            )}
            
            {/* Floating action buttons */}
            <div className="absolute top-3 right-3 flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                className={`rounded-full h-8 w-8 p-0 ${
                  isLiked ? 'bg-red-100 text-red-600' : 'bg-white/80 text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLiked(!isLiked);
                }}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              
              {onShare && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full h-8 w-8 p-0 bg-white/80 text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                >
                  <Share className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Price badge */}
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-green-600 text-white font-semibold px-3 py-1">
                ₹{book.price_range}
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
                {book.title}
              </h3>
              <p className="text-gray-600 text-sm mt-1">by {book.author}</p>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {book.condition}
              </Badge>
              
              {book.location_address && (
                <div className="flex items-center text-gray-500 text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-24">
                    {book.location_address.split(',')[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className={`transition-all duration-200 ${showActions ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInterest(book.id);
                  }}
                >
                  I'm Interested
                </Button>
              </div>
            </div>

            {/* Swipe hints */}
            <div className="flex justify-between text-xs text-gray-400 pt-2 border-t">
              <span>← Swipe to save</span>
              <span>Tap to view</span>
              <span>Swipe to actions →</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TouchHandler>
  );
};
