/*
  # Advanced Messaging and Communication System

  1. Enhanced Chat Features
    - Message status tracking (sent, delivered, read)
    - File attachments support
    - Message reactions
    - Message threading

  2. New Tables
    - `message_attachments` - File attachments in messages
    - `message_reactions` - Emoji reactions to messages
    - `conversation_participants` - Track conversation participants
    - `message_status` - Track message delivery and read status

  3. Features
    - Rich messaging experience
    - File sharing capabilities
    - Read receipts
    - Typing indicators
*/

-- Add new columns to existing chat_messages table
DO $$
BEGIN
  -- Add message type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_type text DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'file', 'system'));
  END IF;

  -- Add reply to message ID for threading
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'reply_to_message_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN reply_to_message_id uuid REFERENCES chat_messages(id);
  END IF;

  -- Add edited timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN edited_at timestamptz;
  END IF;

  -- Add deleted flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;
END $$;

-- Create message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  file_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(message_id, user_id, emoji)
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_typing boolean DEFAULT false,
  typing_updated_at timestamptz,
  
  UNIQUE(purchase_request_id, user_id)
);

-- Create message status table
CREATE TABLE IF NOT EXISTS message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  timestamp timestamptz DEFAULT now(),
  
  UNIQUE(message_id, user_id)
);

-- Create conversation summary view
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
  pr.id as purchase_request_id,
  pr.buyer_id,
  pr.seller_id,
  b.title as book_title,
  buyer.full_name as buyer_name,
  seller.full_name as seller_name,
  last_msg.message as last_message,
  last_msg.created_at as last_message_at,
  last_msg.sender_id as last_sender_id,
  COALESCE(unread_buyer.unread_count, 0) as buyer_unread_count,
  COALESCE(unread_seller.unread_count, 0) as seller_unread_count
FROM purchase_requests pr
JOIN books b ON pr.book_id = b.id
JOIN profiles buyer ON pr.buyer_id = buyer.id
JOIN profiles seller ON pr.seller_id = seller.id
LEFT JOIN LATERAL (
  SELECT message, created_at, sender_id
  FROM chat_messages cm
  WHERE cm.purchase_request_id = pr.id
    AND cm.is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1
) last_msg ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as unread_count
  FROM chat_messages cm
  LEFT JOIN conversation_participants cp ON cp.purchase_request_id = pr.id AND cp.user_id = pr.buyer_id
  WHERE cm.purchase_request_id = pr.id
    AND cm.sender_id != pr.buyer_id
    AND cm.created_at > COALESCE(cp.last_read_at, pr.created_at)
    AND cm.is_deleted = false
) unread_buyer ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as unread_count
  FROM chat_messages cm
  LEFT JOIN conversation_participants cp ON cp.purchase_request_id = pr.id AND cp.user_id = pr.seller_id
  WHERE cm.purchase_request_id = pr.id
    AND cm.sender_id != pr.seller_id
    AND cm.created_at > COALESCE(cp.last_read_at, pr.created_at)
    AND cm.is_deleted = false
) unread_seller ON true;

-- Enable RLS
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_attachments
CREATE POLICY "Users can view attachments in their conversations"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN purchase_requests pr ON cm.purchase_request_id = pr.id
      WHERE cm.id = message_attachments.message_id
        AND (pr.buyer_id = auth.uid() OR pr.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can add attachments to their messages"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.id = message_attachments.message_id
        AND cm.sender_id = auth.uid()
    )
  );

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN purchase_requests pr ON cm.purchase_request_id = pr.id
      WHERE cm.id = message_reactions.message_id
        AND (pr.buyer_id = auth.uid() OR pr.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own reactions"
  ON message_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view their own participation"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage conversation participants"
  ON conversation_participants FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for message_status
CREATE POLICY "Users can view message status in their conversations"
  ON message_status FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.id = message_status.message_id
        AND cm.sender_id = auth.uid()
    )
  );

CREATE POLICY "System can manage message status"
  ON message_status FOR ALL
  TO service_role
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_request ON conversation_participants(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_purchase_request_id uuid,
  p_user_id uuid
)
RETURNS void AS $$
BEGIN
  -- Update last read timestamp
  INSERT INTO conversation_participants (purchase_request_id, user_id, last_read_at)
  VALUES (p_purchase_request_id, p_user_id, now())
  ON CONFLICT (purchase_request_id, user_id)
  DO UPDATE SET last_read_at = now();
  
  -- Mark messages as read
  INSERT INTO message_status (message_id, user_id, status, timestamp)
  SELECT cm.id, p_user_id, 'read', now()
  FROM chat_messages cm
  WHERE cm.purchase_request_id = p_purchase_request_id
    AND cm.sender_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM message_status ms
      WHERE ms.message_id = cm.id AND ms.user_id = p_user_id
    )
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET status = 'read', timestamp = now()
  WHERE message_status.status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(
  p_purchase_request_id uuid,
  p_user_id uuid,
  p_is_typing boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_participants (purchase_request_id, user_id, is_typing, typing_updated_at)
  VALUES (p_purchase_request_id, p_user_id, p_is_typing, now())
  ON CONFLICT (purchase_request_id, user_id)
  DO UPDATE SET 
    is_typing = p_is_typing,
    typing_updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create conversation participants
CREATE OR REPLACE FUNCTION create_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Add buyer as participant
  INSERT INTO conversation_participants (purchase_request_id, user_id)
  VALUES (NEW.id, NEW.buyer_id)
  ON CONFLICT DO NOTHING;
  
  -- Add seller as participant
  INSERT INTO conversation_participants (purchase_request_id, user_id)
  VALUES (NEW.id, NEW.seller_id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_conversation_participants_trigger
  AFTER INSERT ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_participants();

-- Create participants for existing purchase requests
INSERT INTO conversation_participants (purchase_request_id, user_id)
SELECT pr.id, pr.buyer_id
FROM purchase_requests pr
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.purchase_request_id = pr.id AND cp.user_id = pr.buyer_id
);

INSERT INTO conversation_participants (purchase_request_id, user_id)
SELECT pr.id, pr.seller_id
FROM purchase_requests pr
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.purchase_request_id = pr.id AND cp.user_id = pr.seller_id
);