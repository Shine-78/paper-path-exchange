/*
  # User Preferences and Wishlist System

  1. New Tables
    - `user_preferences` - User notification and search preferences
    - `wishlists` - User wishlists for books they want
    - `wishlist_items` - Items in user wishlists
    - `saved_searches` - Save search criteria for notifications

  2. Features
    - Customizable notification preferences
    - Multiple wishlists per user
    - Saved search alerts
    - Book recommendation system foundation
*/

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification preferences
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  book_match_alerts boolean DEFAULT true,
  price_drop_alerts boolean DEFAULT true,
  new_books_nearby boolean DEFAULT true,
  
  -- Search preferences
  max_distance_km integer DEFAULT 25,
  preferred_genres text[] DEFAULT '{}',
  preferred_languages text[] DEFAULT '{"English"}',
  price_range_min integer DEFAULT 0,
  price_range_max integer DEFAULT 10000,
  
  -- Privacy preferences
  show_location boolean DEFAULT true,
  show_rating boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Wishlist',
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wishlist items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  
  -- Can be either a specific book or search criteria
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  
  -- Search criteria for books not yet listed
  title text,
  author text,
  isbn text,
  max_price integer,
  preferred_condition text,
  
  notes text,
  priority integer DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  
  -- Search criteria
  search_query text,
  categories uuid[],
  tags text[],
  min_price integer,
  max_price integer,
  condition text[],
  max_distance_km integer,
  
  -- Notification settings
  notify_immediately boolean DEFAULT true,
  notify_daily_digest boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  last_notified_at timestamptz
);

-- Create book views/interests tracking
CREATE TABLE IF NOT EXISTS book_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'contact')),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, book_id, interaction_type)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for wishlists
CREATE POLICY "Users can manage their own wishlists"
  ON wishlists FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public wishlists"
  ON wishlists FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policies for wishlist_items
CREATE POLICY "Users can manage their wishlist items"
  ON wishlist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wishlists 
      WHERE wishlists.id = wishlist_items.wishlist_id 
      AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public wishlist items"
  ON wishlist_items FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM wishlists 
      WHERE wishlists.id = wishlist_items.wishlist_id 
      AND wishlists.is_public = true
    )
  );

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage their own saved searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for book_interactions
CREATE POLICY "Users can manage their own interactions"
  ON book_interactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Book owners can view interactions on their books"
  ON book_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = book_interactions.book_id 
      AND books.seller_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_public ON wishlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_book ON wishlist_items(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_book_interactions_user_book ON book_interactions(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_book_interactions_book_type ON book_interactions(book_id, interaction_type);

-- Create trigger for updating user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Create trigger for updating wishlists updated_at
CREATE OR REPLACE FUNCTION update_wishlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlists_updated_at();

-- Create default wishlist for existing users
INSERT INTO wishlists (user_id, name, description)
SELECT id, 'My Wishlist', 'Books I want to buy'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM wishlists WHERE wishlists.user_id = profiles.id
);

-- Create default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_preferences WHERE user_preferences.user_id = profiles.id
);