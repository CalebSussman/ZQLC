-- SQL function for bulk CSV import with transaction safety
-- This function handles the complete import process atomically

CREATE OR REPLACE FUNCTION bulk_import_system_data(
  import_data JSONB,
  delete_missing_tasks BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  universe_record RECORD;
  phylum_record RECORD;
  family_record RECORD;
  group_record RECORD;
  task_record RECORD;
  import_record JSONB;
  universe_id UUID;
  phylum_id UUID;
  family_id UUID;
  group_id UUID;
  existing_id UUID;
  stats JSON;
  created_universes INTEGER := 0;
  created_phyla INTEGER := 0;
  created_families INTEGER := 0;
  created_groups INTEGER := 0;
  created_tasks INTEGER := 0;
  updated_universes INTEGER := 0;
  updated_phyla INTEGER := 0;
  updated_families INTEGER := 0;
  updated_groups INTEGER := 0;
  updated_tasks INTEGER := 0;
  deleted_tasks INTEGER := 0;
BEGIN
  -- Start transaction (implicit in function)

  -- Process universes first
  FOR import_record IN SELECT * FROM jsonb_array_elements(import_data) WHERE value->>'type' = 'universe'
  LOOP
    SELECT id INTO existing_id
    FROM universes
    WHERE code = (import_record->>'universe_code');

    IF existing_id IS NOT NULL THEN
      -- Update existing universe
      UPDATE universes
      SET
        name = (import_record->>'universe_name'),
        display_order = COALESCE((import_record->>'display_order')::INTEGER, display_order),
        updated_at = NOW()
      WHERE id = existing_id;
      updated_universes := updated_universes + 1;
    ELSE
      -- Create new universe
      INSERT INTO universes (code, name, display_order)
      VALUES (
        (import_record->>'universe_code'),
        (import_record->>'universe_name'),
        COALESCE((import_record->>'display_order')::INTEGER, 999)
      );
      created_universes := created_universes + 1;
    END IF;
  END LOOP;

  -- Process phyla
  FOR import_record IN SELECT * FROM jsonb_array_elements(import_data) WHERE value->>'type' = 'phylum'
  LOOP
    -- Get universe_id
    SELECT id INTO universe_id
    FROM universes
    WHERE code = (import_record->>'universe_code');

    IF universe_id IS NULL THEN
      RAISE EXCEPTION 'Universe not found for phylum: %', (import_record->>'universe_code');
    END IF;

    SELECT id INTO existing_id
    FROM phyla
    WHERE universe_id = universe_id AND code = (import_record->>'phylum_code');

    IF existing_id IS NOT NULL THEN
      -- Update existing phylum
      UPDATE phyla
      SET
        name = (import_record->>'phylum_name'),
        display_order = COALESCE((import_record->>'display_order')::INTEGER, display_order),
        updated_at = NOW()
      WHERE id = existing_id;
      updated_phyla := updated_phyla + 1;
    ELSE
      -- Create new phylum
      INSERT INTO phyla (universe_id, code, name, display_order)
      VALUES (
        universe_id,
        (import_record->>'phylum_code'),
        (import_record->>'phylum_name'),
        COALESCE((import_record->>'display_order')::INTEGER, 999)
      );
      created_phyla := created_phyla + 1;
    END IF;
  END LOOP;

  -- Process families
  FOR import_record IN SELECT * FROM jsonb_array_elements(import_data) WHERE value->>'type' = 'family'
  LOOP
    -- Get phylum_id
    SELECT p.id INTO phylum_id
    FROM phyla p
    JOIN universes u ON p.universe_id = u.id
    WHERE u.code = (import_record->>'universe_code')
      AND p.code = (import_record->>'phylum_code');

    IF phylum_id IS NULL THEN
      RAISE EXCEPTION 'Phylum not found for family: %/%',
        (import_record->>'universe_code'), (import_record->>'phylum_code');
    END IF;

    SELECT id INTO existing_id
    FROM families
    WHERE phylum_id = phylum_id AND code = (import_record->>'family_code');

    IF existing_id IS NOT NULL THEN
      -- Update existing family
      UPDATE families
      SET
        name = (import_record->>'family_name'),
        display_order = COALESCE((import_record->>'display_order')::INTEGER, display_order),
        updated_at = NOW()
      WHERE id = existing_id;
      updated_families := updated_families + 1;
    ELSE
      -- Create new family
      INSERT INTO families (phylum_id, code, name, display_order)
      VALUES (
        phylum_id,
        (import_record->>'family_code'),
        (import_record->>'family_name'),
        COALESCE((import_record->>'display_order')::INTEGER, 999)
      );
      created_families := created_families + 1;
    END IF;
  END LOOP;

  -- Process groups
  FOR import_record IN SELECT * FROM jsonb_array_elements(import_data) WHERE value->>'type' = 'group'
  LOOP
    -- Get universe_id
    SELECT id INTO universe_id
    FROM universes
    WHERE code = (import_record->>'universe_code');

    -- Get phylum_id
    SELECT p.id INTO phylum_id
    FROM phyla p
    WHERE p.universe_id = universe_id AND p.code = (import_record->>'phylum_code');

    -- Get family_id (optional)
    family_id := NULL;
    IF (import_record->>'family_code') != '' AND (import_record->>'family_code') IS NOT NULL THEN
      SELECT f.id INTO family_id
      FROM families f
      WHERE f.phylum_id = phylum_id AND f.code = (import_record->>'family_code');
    END IF;

    SELECT id INTO existing_id
    FROM groups
    WHERE universe_id = universe_id
      AND phylum_id = phylum_id
      AND (family_id IS NULL OR family_id = family_id)
      AND group_num = (import_record->>'group_num')::INTEGER;

    IF existing_id IS NOT NULL THEN
      -- Update existing group
      UPDATE groups
      SET
        name = (import_record->>'group_name'),
        updated_at = NOW()
      WHERE id = existing_id;
      updated_groups := updated_groups + 1;
    ELSE
      -- Create new group
      INSERT INTO groups (universe_id, phylum_id, family_id, group_num, name)
      VALUES (
        universe_id,
        phylum_id,
        family_id,
        (import_record->>'group_num')::INTEGER,
        (import_record->>'group_name')
      );
      created_groups := created_groups + 1;
    END IF;
  END LOOP;

  -- Process tasks
  FOR import_record IN SELECT * FROM jsonb_array_elements(import_data) WHERE value->>'type' = 'task'
  LOOP
    SELECT id INTO existing_id
    FROM tasks
    WHERE base_code = (import_record->>'base_code');

    IF existing_id IS NOT NULL THEN
      -- Update existing task
      UPDATE tasks
      SET
        title = (import_record->>'task_title'),
        status = (import_record->>'task_status'),
        priority = (import_record->>'task_priority')::INTEGER,
        updated_at = NOW()
      WHERE id = existing_id;

      -- Create task entry for status change if different
      INSERT INTO task_entries (task_id, status_code, note, entry_timestamp)
      SELECT
        existing_id,
        (import_record->>'task_status'),
        'Status updated via CSV import',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM task_entries te
        WHERE te.task_id = existing_id
          AND te.status_code = (import_record->>'task_status')
          AND te.entry_timestamp::date = NOW()::date
      );

      updated_tasks := updated_tasks + 1;
    ELSE
      -- Create new task
      INSERT INTO tasks (base_code, title, status, priority, created_at, updated_at)
      VALUES (
        (import_record->>'base_code'),
        (import_record->>'task_title'),
        (import_record->>'task_status'),
        (import_record->>'task_priority')::INTEGER,
        NOW(),
        NOW()
      )
      RETURNING id INTO existing_id;

      -- Create initial task entry
      INSERT INTO task_entries (task_id, status_code, note, entry_timestamp)
      VALUES (
        existing_id,
        (import_record->>'task_status'),
        'Task created via CSV import',
        NOW()
      );

      created_tasks := created_tasks + 1;
    END IF;
  END LOOP;

  -- Handle task deletion if requested
  IF delete_missing_tasks THEN
    WITH import_task_codes AS (
      SELECT DISTINCT (value->>'base_code') as base_code
      FROM jsonb_array_elements(import_data)
      WHERE value->>'type' = 'task'
    )
    DELETE FROM tasks
    WHERE base_code NOT IN (SELECT base_code FROM import_task_codes)
      AND base_code IS NOT NULL;

    GET DIAGNOSTICS deleted_tasks = ROW_COUNT;
  END IF;

  -- Compile statistics
  stats := json_build_object(
    'created', json_build_object(
      'universes', created_universes,
      'phyla', created_phyla,
      'families', created_families,
      'groups', created_groups,
      'tasks', created_tasks
    ),
    'updated', json_build_object(
      'universes', updated_universes,
      'phyla', updated_phyla,
      'families', updated_families,
      'groups', updated_groups,
      'tasks', updated_tasks
    ),
    'deleted', json_build_object(
      'tasks', deleted_tasks
    ),
    'timestamp', NOW()
  );

  RETURN stats;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE EXCEPTION 'Import failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION bulk_import_system_data TO authenticated;