CREATE SCHEMA IF NOT EXISTS vboard_private;
REVOKE ALL ON SCHEMA vboard_private FROM PUBLIC;
CREATE TABLE vboard_private.legacy_authority (
  source_table text NOT NULL,
  source_id text NOT NULL,
  row_data jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, source_id)
);
INSERT INTO vboard_private.legacy_authority SELECT 'community_invite', id::text, to_jsonb(t), now() FROM public.community_invite t;
INSERT INTO vboard_private.legacy_authority SELECT 'event_host', id::text, to_jsonb(t), now() FROM public.event_host t;
INSERT INTO vboard_private.legacy_authority SELECT 'permission_override', id::text, to_jsonb(t), now() FROM public.permission_override t;
INSERT INTO vboard_private.legacy_authority SELECT 'profile', user_id, to_jsonb(t), now() FROM public.profile t;
INSERT INTO vboard_private.legacy_authority SELECT 'community_member', id::text, to_jsonb(t), now() FROM public.community_member t;
INSERT INTO vboard_private.legacy_authority SELECT 'community', id::text, to_jsonb(t), now() FROM public.community t;
INSERT INTO vboard_private.legacy_authority SELECT 'post', id::text, to_jsonb(t), now() FROM public.post t;
DO $verify$
DECLARE table_name text; original_count bigint; captured_count bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['community_invite','event_host','permission_override','profile','community_member','community','post'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO original_count;
    SELECT count(*) INTO captured_count FROM vboard_private.legacy_authority a WHERE a.source_table = table_name;
    IF original_count <> captured_count THEN RAISE EXCEPTION 'Legacy capture incomplete for %', table_name; END IF;
  END LOOP;
END
$verify$;
DROP TABLE public.community_invite, public.event_host, public.permission_override;
ALTER TABLE public.community_member ALTER COLUMN role DROP DEFAULT;
ALTER TYPE public.community_role RENAME TO legacy_community_role;
CREATE TYPE public.community_role AS ENUM ('lead','organizer');
UPDATE public.community_member SET is_active = false WHERE role::text IN ('volunteer','advisor');
ALTER TABLE public.community_member ALTER COLUMN role TYPE public.community_role USING
  (CASE WHEN role::text = 'lead' THEN 'lead' ELSE 'organizer' END)::public.community_role;
ALTER TABLE public.community_member ALTER COLUMN role SET DEFAULT 'organizer';
ALTER TABLE public.profile DROP COLUMN site_role, DROP COLUMN admin_department;
ALTER TABLE public.community DROP COLUMN department, DROP COLUMN approval_status;
ALTER TABLE public.post DROP COLUMN advisor_approved_at, DROP COLUMN advisor_approved_by;
ALTER TABLE public.post ADD COLUMN is_active boolean NOT NULL DEFAULT true;
DROP TYPE public.legacy_community_role, public.site_role, public.community_approval, public.override_effect;
ALTER TABLE public.post ADD CONSTRAINT post_event_shape CHECK (
  (is_event AND starts_at IS NOT NULL AND location_visibility IS NOT NULL) OR
  (NOT is_event AND starts_at IS NULL AND ends_at IS NULL AND location IS NULL AND location_visibility IS NULL
    AND registration_opens_at IS NULL AND registration_closes_at IS NULL AND capacity IS NULL AND NOT requires_approval)
);
ALTER TABLE public.post ADD CONSTRAINT post_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
ALTER TABLE public.post ADD CONSTRAINT post_dates_order CHECK (
  (ends_at IS NULL OR ends_at >= starts_at) AND
  (registration_opens_at IS NULL OR registration_closes_at IS NULL OR registration_closes_at >= registration_opens_at)
);
DO $validate$
BEGIN
  IF EXISTS (SELECT 1 FROM public.registration r JOIN public.post p ON p.id=r.post_id WHERE NOT p.is_event) THEN
    RAISE EXCEPTION 'Legacy registrations reference announcements';
  END IF;
  IF EXISTS (SELECT 1 FROM public.post p WHERE p.capacity < (SELECT count(*) FROM public.registration r WHERE r.post_id=p.id AND r.status IN ('approved','attended'))) THEN
    RAISE EXCEPTION 'Legacy capacity is below occupied seats';
  END IF;
END
$validate$;

DO $foreign_keys$
DECLARE fk record;
BEGIN
  FOR fk IN SELECT c.conrelid::regclass AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c WHERE c.contype='f' AND c.conrelid IN
      ('public.profile'::regclass,'public.community'::regclass,'public.community_member'::regclass,
       'public.post'::regclass,'public.registration'::regclass,'public.audit_log'::regclass)
      AND c.confdeltype IN ('c','n') LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',fk.table_name,fk.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',fk.table_name,fk.conname,
      replace(replace(fk.definition,'ON DELETE CASCADE','ON DELETE RESTRICT'),'ON DELETE SET NULL','ON DELETE RESTRICT'));
  END LOOP;
END $foreign_keys$;
