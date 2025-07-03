/*
  # Helper Functions for BookEx

  1. Database Functions
    - Function to calculate distance between coordinates
    - Function to get books within radius
    - Function to update book quantities
    - Function to process book sales

  2. Utility Functions
    - Search functions for books
    - Notification helpers
*/

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in kilometers
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Function to get books within a certain radius
CREATE OR REPLACE FUNCTION get_books_within_radius(
  user_lat DECIMAL, 
  user_lon DECIMAL, 
  radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  author TEXT,
  condition TEXT,
  price_range INTEGER,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.condition,
    b.price_range,
    calculate_distance(user_lat, user_lon, b.latitude, b.longitude) as distance_km
  FROM books b
  WHERE 
    b.status = 'available' 
    AND b.latitude IS NOT NULL 
    AND b.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, b.latitude, b.longitude) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to search books with filters
CREATE OR REPLACE FUNCTION search_books(
  search_term TEXT DEFAULT '',
  genre_filter TEXT DEFAULT '',
  condition_filter TEXT DEFAULT '',
  max_price INTEGER DEFAULT NULL,
  user_lat DECIMAL DEFAULT NULL,
  user_lon DECIMAL DEFAULT NULL,
  max_distance DECIMAL DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  author TEXT,
  condition TEXT,
  price_range INTEGER,
  transfer_type TEXT,
  description TEXT,
  location_address TEXT,
  images TEXT[],
  seller_id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.condition,
    b.price_range,
    b.transfer_type,
    b.description,
    b.location_address,
    b.images,
    b.seller_id,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      THEN calculate_distance(user_lat, user_lon, b.latitude, b.longitude)
      ELSE NULL
    END as distance_km
  FROM books b
  WHERE 
    b.status = 'available'
    AND (search_term = '' OR b.title ILIKE '%' || search_term || '%' OR b.author ILIKE '%' || search_term || '%')
    AND (condition_filter = '' OR b.condition = condition_filter)
    AND (max_price IS NULL OR b.price_range <= max_price)
    AND (
      max_distance IS NULL 
      OR user_lat IS NULL 
      OR user_lon IS NULL 
      OR b.latitude IS NULL 
      OR b.longitude IS NULL
      OR calculate_distance(user_lat, user_lon, b.latitude, b.longitude) <= max_distance
    )
  ORDER BY 
    CASE 
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      THEN calculate_distance(user_lat, user_lon, b.latitude, b.longitude)
      ELSE 999999
    END,
    b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_priority TEXT DEFAULT 'normal',
  related_entity_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, priority, related_id
  ) VALUES (
    target_user_id, notification_type, notification_title, 
    notification_message, notification_priority, related_entity_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  target_user_id UUID,
  notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF notification_ids IS NULL THEN
    -- Mark all notifications as read for user
    UPDATE notifications 
    SET read = true 
    WHERE user_id = target_user_id AND read = false;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications 
    SET read = true 
    WHERE user_id = target_user_id AND id = ANY(notification_ids) AND read = false;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days' AND read = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;