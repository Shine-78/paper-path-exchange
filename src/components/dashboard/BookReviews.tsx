
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRating } from "./UserRating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  rating: number;
  review_text: string;
  review_type: string;
  created_at: string;
  reviewer: {
    full_name: string;
    email: string;
  };
}

interface BookReviewsProps {
  bookId: string;
  sellerId: string;
  key?: string | number;
}

export const BookReviews = ({ bookId, sellerId, key }: BookReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerRating, setSellerRating] = useState({ rating: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      console.log('Fetching reviews for book:', bookId);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          review_type,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }
      
      console.log('Fetched reviews:', data);
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchSellerRating = async () => {
    try {
      console.log('Fetching seller rating for:', sellerId);
      const { data, error } = await supabase
        .from('profiles')
        .select('average_rating, review_count')
        .eq('id', sellerId)
        .single();

      if (error) {
        console.error('Error fetching seller rating:', error);
        throw error;
      }
      
      if (data) {
        console.log('Seller rating data:', data);
        setSellerRating({
          rating: data.average_rating || 0,
          count: data.review_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching seller rating:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookId && sellerId) {
      fetchReviews();
      fetchSellerRating();
    }
  }, [bookId, sellerId, key]);

  // Set up real-time subscription for new reviews
  useEffect(() => {
    if (!bookId) return;

    const channel = supabase
      .channel('reviews_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
        filter: `book_id=eq.${bookId}`
      }, (payload) => {
        console.log('New review added:', payload);
        fetchReviews();
        fetchSellerRating();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      {/* Seller Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seller Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <UserRating 
            rating={sellerRating.rating} 
            reviewCount={sellerRating.count} 
            size="lg"
          />
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {review.reviewer.full_name?.charAt(0) || review.reviewer.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {review.reviewer.full_name || 'Anonymous'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {review.review_type === 'buyer_to_seller' ? 'Buyer' : 'Seller'}
                      </Badge>
                    </div>
                    <UserRating rating={review.rating} reviewCount={0} showText={false} size="sm" />
                    {review.review_text && (
                      <p className="text-sm text-gray-600 mt-2">{review.review_text}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {reviews.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No reviews yet for this book</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
