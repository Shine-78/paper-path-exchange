/*
  # Performance Optimization - Add Missing Indexes

  1. New Indexes
    - Add composite indexes for common query patterns
    - Add indexes for frequently filtered columns
    - Add indexes for sorting operations

  2. Query Optimization
    - Improve performance for book discovery
    - Optimize notification queries
    - Speed up purchase request lookups
*/

-- Composite index for book discovery with location filtering
CREATE INDEX IF NOT EXISTS idx_books_status_location 
ON books (status, latitude, longitude) 
WHERE status = 'available';

-- Index for book search by title and author
CREATE INDEX IF NOT EXISTS idx_books_search 
ON books USING gin(to_tsvector('english', title || ' ' || author));

-- Composite index for purchase requests by status and dates
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status_date 
ON purchase_requests (status, created_at DESC);

-- Index for notifications by user and read status with date ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date 
ON notifications (user_id, read, created_at DESC);

-- Index for delivery confirmations by purchase request
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_request 
ON delivery_confirmations (purchase_request_id);

-- Index for reviews by reviewed user for rating calculations
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_rating 
ON reviews (reviewed_user_id, rating);

-- Index for chat messages by purchase request and date
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_date 
ON chat_messages (purchase_request_id, created_at DESC);

-- Partial index for active books only
CREATE INDEX IF NOT EXISTS idx_books_active_price 
ON books (price_range, created_at DESC) 
WHERE status = 'available' AND listing_paid = true;

-- Index for books by seller and status
CREATE INDEX IF NOT EXISTS idx_books_seller_status 
ON books (seller_id, status, created_at DESC);

-- Index for purchase requests with expected delivery date
CREATE INDEX IF NOT EXISTS idx_purchase_requests_delivery_date 
ON purchase_requests (expected_delivery_date) 
WHERE expected_delivery_date IS NOT NULL AND status = 'accepted';