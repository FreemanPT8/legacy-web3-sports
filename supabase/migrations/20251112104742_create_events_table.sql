/*
  # Criar Tabela de Eventos

  1. Nova Tabela
    - `events`
      - `id` (uuid, chave primária)
      - `title` (jsonb) - Títulos multilíngues
      - `description` (jsonb) - Descrições multilíngues
      - `category` (text) - Categoria do evento (webinar, workshop, meetup, competition)
      - `date` (timestamptz) - Data do evento
      - `location` (text) - Local (online ou físico)
      - `is_online` (boolean) - Se o evento é online
      - `max_attendees` (integer) - Número máximo de participantes
      - `current_attendees` (integer) - Número atual de participantes
      - `registration_url` (text) - URL para registo
      - `image_url` (text) - URL da imagem do evento
      - `published` (boolean) - Se o evento está publicado
      - `created_by` (uuid) - ID do admin que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Enable RLS na tabela `events`
    - Política para todos verem eventos publicados
    - Política para admins criarem/editarem eventos
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL,
  description jsonb NOT NULL,
  category text NOT NULL CHECK (category IN ('webinar', 'workshop', 'meetup', 'competition')),
  date timestamptz NOT NULL,
  location text NOT NULL DEFAULT 'Online',
  is_online boolean DEFAULT true,
  max_attendees integer DEFAULT 100,
  current_attendees integer DEFAULT 0,
  registration_url text,
  image_url text,
  published boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON events
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can view all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Super Admin')
    )
  );

CREATE POLICY "Admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Super Admin')
    )
  );

CREATE POLICY "Admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Super Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Super Admin')
    )
  );

CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Super Admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);