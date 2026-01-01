/*
  # Glossário Legacy – progress reading

  - Regista conclúsões de leitura de termos para XP
  - 2 XP por termo, apenas uma vez por utilizador
  - Suporta auditoria/admins com políticas dedicadas
*/

CREATE TABLE IF NOT EXISTS glossary_term_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_earned integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(term_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_glossary_term_reads_user
  ON glossary_term_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_glossary_term_reads_term
  ON glossary_term_reads(term_id);

ALTER TABLE glossary_term_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own glossary term reads"
  ON glossary_term_reads FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Users can insert own glossary term reads"
  ON glossary_term_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage glossary term reads"
  ON glossary_term_reads FOR ALL
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

INSERT INTO xp_rewards (action_type, min_xp, max_xp, creator_bonus_pct)
VALUES ('glossary_term_read', 2, 2, 0)
ON CONFLICT (action_type) DO UPDATE
SET
  min_xp = EXCLUDED.min_xp,
  max_xp = EXCLUDED.max_xp,
  creator_bonus_pct = EXCLUDED.creator_bonus_pct;
