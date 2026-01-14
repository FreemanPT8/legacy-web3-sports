-- Create house private messages table for admin and member communications.
CREATE TABLE IF NOT EXISTS house_private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses_of_sports(id) ON DELETE CASCADE,
  house_key TEXT NOT NULL,
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS _idx_house_private_messages_house_key ON house_private_messages(house_key);
CREATE INDEX IF NOT EXISTS _idx_house_private_messages_recipient ON house_private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS _idx_house_private_messages_sender ON house_private_messages(sender_id);
CREATE INDEX IF NOT EXISTS _idx_house_private_messages_house_read ON house_private_messages(house_key, read_at);
