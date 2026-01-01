/*
  # Glossário Legacy

  - Estruturas para termos multilíngues (PT/ES/EN) e metadados
  - Histórico de versões e ligações entre conteúdos (aulas/blogs)
  - RLS alinhado com o restante stack (membros veem termos publicados; admins gerem tudo)
*/

CREATE TABLE IF NOT EXISTS glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  term_pt text NOT NULL,
  term_es text NOT NULL,
  term_en text NOT NULL,
  definition_pt text NOT NULL,
  definition_es text NOT NULL,
  definition_en text NOT NULL,
  example_pt text,
  example_es text,
  example_en text,
  aliases text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(term_pt, '') || ' ' ||
      coalesce(term_es, '') || ' ' ||
      coalesce(term_en, '') || ' ' ||
      coalesce(definition_pt, '') || ' ' ||
      coalesce(definition_es, '') || ' ' ||
      coalesce(definition_en, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_status ON glossary_terms(status);
CREATE INDEX IF NOT EXISTS idx_glossary_terms_tags ON glossary_terms USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_glossary_terms_search ON glossary_terms USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS glossary_term_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_term_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('lesson', 'blog_post', 'academy_page')),
  content_id uuid NOT NULL,
  display_text text NOT NULL,
  language text NOT NULL CHECK (language IN ('pt', 'es', 'en')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(term_id, content_type, content_id, display_text, language)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION set_glossary_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_glossary_terms_updated_at
  BEFORE UPDATE ON glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION set_glossary_updated_at();

-- Trigger para registar versões
CREATE OR REPLACE FUNCTION log_glossary_term_version()
RETURNS trigger AS $$
DECLARE
  v_action text;
  v_snapshot jsonb;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
  END;

  IF TG_OP = 'DELETE' THEN
    v_snapshot := to_jsonb(OLD);
  ELSE
    v_snapshot := to_jsonb(NEW);
  END IF;

  INSERT INTO glossary_term_versions (term_id, snapshot, action, changed_by)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    v_snapshot,
    v_action,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_glossary_terms_version ON glossary_terms;

CREATE TRIGGER trg_glossary_terms_version
  AFTER INSERT OR UPDATE OR DELETE ON glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION log_glossary_term_version();

ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_term_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_term_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem termos publicados"
  ON glossary_terms FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Admins gerem glossário"
  ON glossary_terms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Admins consultam versões"
  ON glossary_term_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Admins gerem versões"
  ON glossary_term_versions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Admins gerem ligações"
  ON glossary_term_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Membros veem ligações de termos"
  ON glossary_term_links FOR SELECT
  TO authenticated
  USING (true);
