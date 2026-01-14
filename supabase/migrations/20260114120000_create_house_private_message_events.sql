-- Track read/reply history for house private messages.
ALTER TABLE house_private_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES house_private_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS house_private_message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES house_private_messages(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses_of_sports(id) ON DELETE CASCADE,
  house_key TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('read', 'reply')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS _idx_house_private_message_events_message
  ON house_private_message_events(message_id);
CREATE INDEX IF NOT EXISTS _idx_house_private_message_events_house
  ON house_private_message_events(house_key);
CREATE INDEX IF NOT EXISTS _idx_house_private_message_events_actor
  ON house_private_message_events(actor_id);
CREATE INDEX IF NOT EXISTS _idx_house_private_message_events_type
  ON house_private_message_events(event_type);
