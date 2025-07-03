/*
  # Initial BookEx Database Schema

  1. New Tables
    - `profiles` - User profiles with location and rating data
    - `books` - Book listings with seller information
    - `purchase_requests` - Buyer requests to purchase books
    - `chat_messages` - Chat between buyers and sellers
    - `delivery_confirmations` - OTP and delivery confirmation system
    - `reviews` - User reviews and ratings
    - `notifications` - In-app notifications
    - `admin_users` - Admin user management

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure admin access

  3. Storage
    - Create book-images bucket for file uploads
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location_address TEXT,
  postal_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  average_rating DECIMAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  registration_paid BOOLEAN DEFAULT false,
  registration_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  price_range INTEGER NOT NULL,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('pickup', 'delivery', 'both')),
  description TEXT,
  location_address TEXT,
  postal_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  images TEXT[],
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'inactive')),
  listing_paid BOOLEAN DEFAULT false,
  listing_payment_id TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchase_requests table
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  offered_price INTEGER NOT NULL,
  transfer_mode TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  expected_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create delivery_confirmations table
CREATE TABLE IF NOT EXISTS delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  otp_sent_at TIMESTAMPTZ DEFAULT now(),
  otp_verified_at TIMESTAMPTZ,
  buyer_confirmed_delivery BOOLEAN DEFAULT false,
  seller_confirmed_delivery BOOLEAN DEFAULT false,
  buyer_confirmed_payment BOOLEAN DEFAULT false,
  seller_confirmed_payment BOOLEAN DEFAULT false,
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  final_payout_processed BOOLEAN DEFAULT false,
  expected_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase_request', 'request_accepted', 'request_rejected', 'delivery_scheduled', 'delivery_otp', 'otp_verified', 'book_sold', 'purchase_confirmed', 'payout_processed', 'transaction_complete', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  related_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles" ON profiles
  FOR SELECT USING (true);

-- Books policies
CREATE POLICY "Anyone can view available books" ON books
  FOR SELECT USING (status = 'available' OR seller_id = auth.uid());

CREATE POLICY "Users can create books" ON books
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own books" ON books
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own books" ON books
  FOR DELETE USING (auth.uid() = seller_id);

-- Purchase requests policies
CREATE POLICY "Users can view own purchase requests" ON purchase_requests
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create purchase requests" ON purchase_requests
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update purchase requests" ON purchase_requests
  FOR UPDATE USING (auth.uid() = seller_id);

-- Chat messages policies
CREATE POLICY "Users can view chat messages" ON chat_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT buyer_id FROM purchase_requests WHERE id = purchase_request_id
      UNION
      SELECT seller_id FROM purchase_requests WHERE id = purchase_request_id
    )
  );

CREATE POLICY "Users can send chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Delivery confirmations policies
CREATE POLICY "Users can view delivery confirmations" ON delivery_confirmations
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update delivery confirmations" ON delivery_confirmations
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin users policies
CREATE POLICY "Only admins can view admin users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_seller_id ON books(seller_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_location ON books(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_buyer_id ON purchase_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_seller_id ON purchase_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_book_id ON purchase_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id ON chat_messages(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update average rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET 
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM reviews 
      WHERE reviewed_user_id = NEW.reviewed_user_id
    ),
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviewed_user_id = NEW.reviewed_user_id
    )
  WHERE id = NEW.reviewed_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rating updates
DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Create storage bucket for book images
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for book images
CREATE POLICY "Anyone can view book images" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-images');

CREATE POLICY "Authenticated users can upload book images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own book images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'book-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own book images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'book-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );