-- Ensure onboarding popups can store localized copy metadata
ALTER TABLE public.onboarding_popups
  ADD COLUMN IF NOT EXISTS copy_i18n jsonb DEFAULT '{}'::jsonb;

-- Track ordering explicitly when persisting from the admin panel
ALTER TABLE public.onboarding_popups
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
