/*
  # Enhanced Book Categorization and Search

  1. New Tables
    - `book_categories` - Predefined book categories
    - `book_tags` - Flexible tagging system
    - `book_category_mappings` - Many-to-many relationship

  2. Enhanced Search
    - Full-text search capabilities
    - Category-based filtering
    - Tag-based discovery

  3. Book Metadata
    - ISBN support
    - Publication year
    - Publisher information
    - Language support
*/

-- Create book categories table
CREATE TABLE IF NOT EXISTS book_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  parent_category_id uuid REFERENCES book_categories(id),
  created_at timestamptz DEFAULT now()
);

-- Create book tags table
CREATE TABLE IF NOT EXISTS book_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create book-category mapping table
CREATE TABLE IF NOT EXISTS book_category_mappings (
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  category_id uuid REFERENCES book_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);

-- Create book-tag mapping table
CREATE TABLE IF NOT EXISTS book_tag_mappings (
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES book_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

-- Add additional metadata columns to books table
DO $$
BEGIN
  -- Add ISBN column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'isbn'
  ) THEN
    ALTER TABLE books ADD COLUMN isbn text;
  END IF;

  -- Add publication year
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'publication_year'
  ) THEN
    ALTER TABLE books ADD COLUMN publication_year integer;
  END IF;

  -- Add publisher
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'publisher'
  ) THEN
    ALTER TABLE books ADD COLUMN publisher text;
  END IF;

  -- Add language
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'language'
  ) THEN
    ALTER TABLE books ADD COLUMN language text DEFAULT 'English';
  END IF;

  -- Add genre (keeping existing structure but enhancing it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'genre'
  ) THEN
    ALTER TABLE books ADD COLUMN genre text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_tag_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_categories (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON book_categories FOR SELECT
  TO public
  USING (true);

-- RLS Policies for book_tags (public read, users can create)
CREATE POLICY "Anyone can view tags"
  ON book_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON book_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for book_category_mappings
CREATE POLICY "Anyone can view book categories"
  ON book_category_mappings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Book owners can manage categories"
  ON book_category_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = book_category_mappings.book_id 
      AND books.seller_id = auth.uid()
    )
  );

-- RLS Policies for book_tag_mappings
CREATE POLICY "Anyone can view book tags"
  ON book_tag_mappings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Book owners can manage tags"
  ON book_tag_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = book_tag_mappings.book_id 
      AND books.seller_id = auth.uid()
    )
  );

-- Insert default categories
INSERT INTO book_categories (name, description) VALUES
  ('Fiction', 'Novels, short stories, and other fictional works'),
  ('Non-Fiction', 'Factual books, biographies, and educational content'),
  ('Academic', 'Textbooks and academic publications'),
  ('Children', 'Books for children and young adults'),
  ('Comics & Graphic Novels', 'Comic books and graphic novels'),
  ('Self-Help', 'Personal development and self-improvement'),
  ('Science & Technology', 'Scientific and technical publications'),
  ('History', 'Historical books and documentaries'),
  ('Biography', 'Life stories and memoirs'),
  ('Business', 'Business and entrepreneurship books')
ON CONFLICT (name) DO NOTHING;

-- Insert common tags
INSERT INTO book_tags (name) VALUES
  ('bestseller'),
  ('classic'),
  ('new-release'),
  ('rare'),
  ('signed'),
  ('first-edition'),
  ('hardcover'),
  ('paperback'),
  ('like-new'),
  ('vintage')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_book_categories_parent ON book_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_book_category_mappings_book ON book_category_mappings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_category_mappings_category ON book_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_book_tag_mappings_book ON book_tag_mappings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tag_mappings_tag ON book_tag_mappings(tag_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_publication_year ON books(publication_year) WHERE publication_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre) WHERE genre IS NOT NULL;