/*
  # Sistema de Notificações

  1. Nova Tabela
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `type` (text) - achievement, forum, course, xp, system
      - `title` (text)
      - `message` (text)
      - `read` (boolean)
      - `link` (text, optional)
      - `created_at` (timestamptz)
      - `data` (jsonb, optional metadata)

  2. Segurança
    - Enable RLS
    - Users can only see their own notifications
    - Users can mark their notifications as read
    - Users can delete their own notifications

  3. Indexes
    - Index on user_id for fast queries
    - Index on created_at for sorting
    - Index on read status for filtering
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('achievement', 'forum', 'course', 'xp', 'system', 'mission')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  link text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own notifications (for system-generated ones)
CREATE POLICY "Users can create own notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM notifications
  WHERE user_id = p_user_id AND read = false;
$$;

-- Function to mark all as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;
$$;

-- Create some sample notifications for existing users
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN (SELECT id FROM users LIMIT 5)
  LOOP
    -- Welcome notification
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_user.id,
      'system',
      'Bem-vindo ao LEGACY!',
      'Parabéns por se juntar à plataforma. Comece a explorar os cursos disponíveis.',
      '/education'
    );
    
    -- Achievement notification
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_user.id,
      'achievement',
      'Primeira Conquista!',
      'Desbloqueou a conquista "Primeiro Passo" por se registar na plataforma.',
      '/profile'
    );
  END LOOP;
END $$;
