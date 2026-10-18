CREATE SCHEMA vboard_api;
REVOKE ALL ON SCHEMA vboard_api FROM PUBLIC;
CREATE OR REPLACE FUNCTION vboard_api.actor_id() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE actor text := nullif(current_setting('vboard.actor_id', true), '');
BEGIN
  IF actor IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = actor AND u.email_verified
    AND lower(u.email) LIKE '%@vit.edu.in') THEN RAISE EXCEPTION 'Invalid actor' USING ERRCODE = '42501'; END IF;
  RETURN actor;
END $$;
CREATE FUNCTION vboard_api.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."user" u JOIN vboard_private.super_admin_email e ON e.email = lower(u.email)
    WHERE u.id = vboard_api.actor_id())
$$;
CREATE FUNCTION vboard_api.leads(community_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT vboard_api.is_super_admin() OR EXISTS (SELECT 1 FROM public.community_member m
    JOIN public.community c ON c.id = m.community_id WHERE m.community_id = leads.community_id
      AND m.user_id = vboard_api.actor_id() AND m.is_active AND c.is_active AND m.role = 'lead')
$$;
CREATE FUNCTION vboard_api.operates(community_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT vboard_api.is_super_admin() OR EXISTS (SELECT 1 FROM public.community_member m
    JOIN public.community c ON c.id = m.community_id WHERE m.community_id = operates.community_id
      AND m.user_id = vboard_api.actor_id() AND m.is_active AND c.is_active)
$$;
CREATE FUNCTION vboard_api.visible(post_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.post p JOIN public.community c ON c.id=p.community_id
    WHERE p.id=visible.post_id AND p.is_active AND c.is_active AND p.status='published'
      AND (p.visibility='public' OR vboard_api.actor_id() IS NOT NULL))
$$;
CREATE FUNCTION vboard_api.event_operator(post_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.post p WHERE p.id=event_operator.post_id AND p.is_event
    AND p.is_active AND vboard_api.operates(p.community_id))
$$;
GRANT USAGE ON SCHEMA public, vboard_private, vboard_api TO vboard_guard;
GRANT SELECT ON public."user", public.profile, public.community, public.community_member, public.post, public.registration, public.audit_log TO vboard_guard;
GRANT SELECT ON vboard_private.super_admin_email TO vboard_guard;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community FORCE ROW LEVEL SECURITY;
ALTER TABLE public.community_member FORCE ROW LEVEL SECURITY;
ALTER TABLE public.post FORCE ROW LEVEL SECURITY;
ALTER TABLE public.registration FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY guard_read ON public.profile FOR SELECT TO vboard_guard USING (true);
CREATE POLICY guard_read ON public.community FOR SELECT TO vboard_guard USING (true);
CREATE POLICY guard_read ON public.community_member FOR SELECT TO vboard_guard USING (true);
CREATE POLICY guard_read ON public.post FOR SELECT TO vboard_guard USING (true);
CREATE POLICY guard_read ON public.registration FOR SELECT TO vboard_guard USING (true);
CREATE POLICY guard_read ON public.audit_log FOR SELECT TO vboard_guard USING (true);
