-- Integration smoke tests for the Milestone 4 private compatibility settings.
-- Runs only against the disposable PostgreSQL service created by this workflow.
BEGIN;

INSERT INTO auth.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

SELECT public.joyheart_save_member_compatibility_settings(
  '{
    "preferred_age_min": 25,
    "preferred_age_max": 40,
    "preferred_countries": ["Kenya"],
    "preferred_languages": ["English"],
    "relationship_intentions": ["Long-term relationship"],
    "discovery_enabled": false
  }'::jsonb,
  '{
    "communication": "A thoughtful conversation",
    "weekend": "Exploring somewhere new"
  }'::jsonb
);

DO $test$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.member_discovery_preferences;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Owner should read exactly one preference row; got %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.member_personality_answers;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Owner should read exactly one personality row; got %', v_count;
  END IF;
END;
$test$;

-- A different authenticated member must not see or alter the first member's rows.
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

DO $test$
DECLARE
  v_count integer;
  v_updated integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.member_discovery_preferences;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Second member can see another member preference row';
  END IF;

  UPDATE public.member_discovery_preferences
  SET discovery_enabled = true
  WHERE user_id = '11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 0 THEN
    RAISE EXCEPTION 'Second member changed another member preference row';
  END IF;
END;
$test$;

-- Invalid age ranges must be rejected by the RPC.
DO $test$
BEGIN
  BEGIN
    PERFORM public.joyheart_save_member_compatibility_settings(
      '{
        "preferred_age_min": 16,
        "preferred_age_max": 40,
        "preferred_countries": [],
        "preferred_languages": [],
        "relationship_intentions": [],
        "discovery_enabled": false
      }'::jsonb,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'Invalid age range was unexpectedly accepted';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN
      NULL;
  END;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.member_discovery_preferences', 'SELECT')
     OR has_table_privilege('anon', 'public.member_personality_answers', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous role unexpectedly has table SELECT access';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.joyheart_save_member_compatibility_settings(jsonb,jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Anonymous role unexpectedly has RPC EXECUTE access';
  END IF;

  IF NOT has_function_privilege(
       'authenticated',
       'public.joyheart_save_member_compatibility_settings(jsonb,jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Authenticated role is missing RPC EXECUTE access';
  END IF;
END;
$test$;

ROLLBACK;
