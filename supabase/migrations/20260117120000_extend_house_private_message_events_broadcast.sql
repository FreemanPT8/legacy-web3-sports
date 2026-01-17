-- Extend message event types for broadcast history.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_private_message_events_event_type_check'
  ) THEN
    ALTER TABLE house_private_message_events
      DROP CONSTRAINT house_private_message_events_event_type_check;
  END IF;
END $$;

ALTER TABLE house_private_message_events
  ADD CONSTRAINT house_private_message_events_event_type_check
  CHECK (event_type IN ('read', 'reply', 'archive', 'unarchive', 'delete', 'broadcast'));
