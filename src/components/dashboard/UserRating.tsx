
import { Star } from "lucide-react";

interface UserRatingProps {
  rating: number;
  reviewCount: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserRating = ({ 
  rating, 
  reviewCount, 
  showText = true, 
  size = 'md' 
}: UserRatingProps) => {
  const starSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  if (reviewCount === 0) {
    return showText ? (
      <span className={`text-gray-500 ${textSize}`}>No reviews yet</span>
    ) : null;
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className={`text-gray-600 ${textSize}`}>
          {rating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};
