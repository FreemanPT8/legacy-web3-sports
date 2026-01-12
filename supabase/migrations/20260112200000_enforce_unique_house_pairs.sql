-- Normalize stored country codes to uppercase for consistent lookups
UPDATE public.houses_of_sports
SET country_code = UPPER(country_code)
WHERE country_code IS NOT NULL
  AND country_code <> UPPER(country_code);

-- Merge duplicated Houses sharing the same sport/country pair
DO $$
DECLARE
  duplicate_rows integer := 0;
  fk_record RECORD;
BEGIN
  DROP TABLE IF EXISTS tmp_house_duplicates;
  CREATE TEMP TABLE tmp_house_duplicates AS
  SELECT
    id AS duplicate_id,
    MIN(id) OVER (PARTITION BY sport_id, country_code ORDER BY created_at NULLS FIRST, id) AS canonical_id
  FROM (
    SELECT
      id,
      sport_id,
      UPPER(country_code) AS country_code,
      ROW_NUMBER() OVER (
        PARTITION BY sport_id, UPPER(country_code)
        ORDER BY created_at NULLS FIRST, id
      ) AS rn
    FROM public.houses_of_sports
    WHERE sport_id IS NOT NULL
      AND country_code IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1;

  GET DIAGNOSTICS duplicate_rows = ROW_COUNT;

  IF duplicate_rows > 0 THEN
    FOR fk_record IN
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'houses_of_sports'
        AND ccu.column_name = 'id'
    LOOP
      EXECUTE format(
        'UPDATE %I.%I AS tgt
            SET %I = map.canonical_id
          FROM tmp_house_duplicates map
          WHERE tgt.%I = map.duplicate_id',
        fk_record.table_schema,
        fk_record.table_name,
        fk_record.column_name,
        fk_record.column_name
      );
    END LOOP;

    DELETE FROM public.houses_of_sports hos
    USING tmp_house_duplicates map
    WHERE hos.id = map.duplicate_id;
  END IF;
END $$;

-- Enforce uniqueness per sport/country pair (non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS houses_of_sports_sport_country_key
  ON public.houses_of_sports (sport_id, country_code)
  WHERE sport_id IS NOT NULL AND country_code IS NOT NULL;
