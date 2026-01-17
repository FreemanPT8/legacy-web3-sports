-- Migration: Remove legacy modules/lessons tables

ALTER TABLE IF EXISTS lesson_completions
  DROP CONSTRAINT IF EXISTS lesson_completions_lesson_id_fkey;

DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS modules;
