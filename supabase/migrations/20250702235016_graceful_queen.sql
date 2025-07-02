/*
  # Analytics and Reporting System

  1. New Tables
    - `book_analytics` - Track book performance metrics
    - `user_analytics` - Track user engagement metrics
    - `platform_analytics` - Overall platform statistics
    - `search_analytics` - Track search patterns

  2. Features
    - Book view tracking
    - Search pattern analysis
    - User engagement metrics
    - Revenue tracking
    - Popular books/categories
*/

-- Create book analytics table
CREATE TABLE IF NOT EXISTS book_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- View metrics
  total_views integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  daily_views integer DEFAULT 0,
  weekly_views integer DEFAULT 0,
  
  -- Engagement metrics
  total_likes integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  total_contacts integer DEFAULT 0,
  wishlist_adds integer DEFAULT 0,
  
  -- Performance metrics
  days_listed integer DEFAULT 0,
  price_changes integer DEFAULT 0,
  
  -- Calculated fields
  view_to_contact_rate numeric(5,2) DEFAULT 0,
  popularity_score numeric(10,2) DEFAULT 0,
  
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create user analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Activity metrics
  total_logins integer DEFAULT 0,
  last_login_at timestamptz,
  session_count integer DEFAULT 0,
  avg_session_duration interval,
  
  -- Book metrics
  books_listed integer DEFAULT 0,
  books_sold integer DEFAULT 0,
  books_bought integer DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  
  -- Engagement metrics
  searches_performed integer DEFAULT 0,
  wishlists_created integer DEFAULT 0,
  reviews_given integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  
  -- Calculated metrics
  seller_rating numeric(3,2) DEFAULT 0,
  buyer_rating numeric(3,2) DEFAULT 0,
  response_rate numeric(5,2) DEFAULT 0,
  
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Search details
  search_query text,
  search_filters jsonb,
  results_count integer DEFAULT 0,
  
  -- User interaction
  clicked_results integer DEFAULT 0,
  time_spent_on_results interval,
  
  -- Location data (anonymized)
  search_location_city text,
  search_location_state text,
  
  created_at timestamptz DEFAULT now()
);

-- Create platform analytics table (daily aggregates)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  
  -- User metrics
  new_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  returning_users integer DEFAULT 0,
  
  -- Book metrics
  new_books_listed integer DEFAULT 0,
  books_sold integer DEFAULT 0,
  total_active_listings integer DEFAULT 0,
  
  -- Transaction metrics
  total_transactions integer DEFAULT 0,
  total_transaction_value numeric(12,2) DEFAULT 0,
  avg_transaction_value numeric(10,2) DEFAULT 0,
  
  -- Engagement metrics
  total_searches integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  total_reviews integer DEFAULT 0,
  
  -- Popular categories (top 5)
  popular_categories text[],
  popular_search_terms text[],
  
  created_at timestamptz DEFAULT now()
);

-- Create book popularity view
CREATE OR REPLACE VIEW popular_books AS
SELECT 
  b.id,
  b.title,
  b.author,
  b.price_range,
  ba.total_views,
  ba.total_likes,
  ba.total_contacts,
  ba.popularity_score,
  RANK() OVER (ORDER BY ba.popularity_score DESC) as popularity_rank
FROM books b
JOIN book_analytics ba ON b.id = ba.book_id
WHERE b.status = 'available'
ORDER BY ba.popularity_score DESC;

-- Create user engagement view
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  ua.total_logins,
  ua.books_listed,
  ua.books_sold,
  ua.books_bought,
  ua.seller_rating,
  ua.buyer_rating,
  CASE 
    WHEN ua.books_listed > 0 THEN (ua.books_sold::numeric / ua.books_listed * 100)
    ELSE 0 
  END as sell_through_rate
FROM profiles p
LEFT JOIN user_analytics ua ON p.id = ua.user_id;

-- Enable RLS
ALTER TABLE book_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_analytics
CREATE POLICY "Book owners can view their book analytics"
  ON book_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = book_analytics.book_id 
      AND books.seller_id = auth.uid()
    )
  );

CREATE POLICY "System can update book analytics"
  ON book_analytics FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for user_analytics
CREATE POLICY "Users can view their own analytics"
  ON user_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can update user analytics"
  ON user_analytics FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for search_analytics
CREATE POLICY "Users can view their own search analytics"
  ON search_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert search analytics"
  ON search_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for platform_analytics (admin only)
CREATE POLICY "Admins can view platform analytics"
  ON platform_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_book_analytics_book ON book_analytics(book_id);
CREATE INDEX IF NOT EXISTS idx_book_analytics_popularity ON book_analytics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_analytics_date ON platform_analytics(date DESC);

-- Create functions to update analytics

-- Function to update book analytics
CREATE OR REPLACE FUNCTION update_book_analytics(book_uuid uuid, interaction_type text)
RETURNS void AS $$
BEGIN
  INSERT INTO book_analytics (book_id) 
  VALUES (book_uuid)
  ON CONFLICT (book_id) DO NOTHING;
  
  CASE interaction_type
    WHEN 'view' THEN
      UPDATE book_analytics 
      SET total_views = total_views + 1,
          daily_views = daily_views + 1,
          last_updated = now()
      WHERE book_id = book_uuid;
    WHEN 'like' THEN
      UPDATE book_analytics 
      SET total_likes = total_likes + 1,
          last_updated = now()
      WHERE book_id = book_uuid;
    WHEN 'contact' THEN
      UPDATE book_analytics 
      SET total_contacts = total_contacts + 1,
          last_updated = now()
      WHERE book_id = book_uuid;
    WHEN 'share' THEN
      UPDATE book_analytics 
      SET total_shares = total_shares + 1,
          last_updated = now()
      WHERE book_id = book_uuid;
  END CASE;
  
  -- Update popularity score (simple algorithm)
  UPDATE book_analytics 
  SET popularity_score = (total_views * 1.0) + (total_likes * 2.0) + (total_contacts * 5.0) + (total_shares * 3.0)
  WHERE book_id = book_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create analytics records for new books
CREATE OR REPLACE FUNCTION create_book_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO book_analytics (book_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_book_analytics_trigger
  AFTER INSERT ON books
  FOR EACH ROW
  EXECUTE FUNCTION create_book_analytics();

-- Create analytics records for existing books
INSERT INTO book_analytics (book_id)
SELECT id FROM books
WHERE NOT EXISTS (
  SELECT 1 FROM book_analytics WHERE book_analytics.book_id = books.id
);

-- Create user analytics records for existing users
INSERT INTO user_analytics (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_analytics WHERE user_analytics.user_id = profiles.id
);