REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, vboard_app, vboard_auth;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, vboard_app, vboard_auth;
GRANT USAGE ON SCHEMA public TO vboard_app, vboard_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user",public.session,public.account,public.verification TO vboard_auth;
GRANT SELECT, INSERT, UPDATE ON public.profile,public.community,public.community_member,public.post,public.registration TO vboard_app;
GRANT SELECT, INSERT ON public.audit_log TO vboard_app;
GRANT USAGE ON SCHEMA vboard_api TO vboard_app;
CREATE POLICY profile_select ON public.profile FOR SELECT TO vboard_app USING (user_id=vboard_api.actor_id() OR vboard_api.is_super_admin());
CREATE POLICY profile_insert ON public.profile FOR INSERT TO vboard_app WITH CHECK (user_id=vboard_api.actor_id());
CREATE POLICY profile_update ON public.profile FOR UPDATE TO vboard_app USING (user_id=vboard_api.actor_id()) WITH CHECK (user_id=vboard_api.actor_id());
CREATE POLICY community_select ON public.community FOR SELECT TO vboard_app USING (is_active OR vboard_api.is_super_admin());
CREATE POLICY community_insert ON public.community FOR INSERT TO vboard_app WITH CHECK (vboard_api.is_super_admin());
CREATE POLICY community_update ON public.community FOR UPDATE TO vboard_app USING (vboard_api.leads(id)) WITH CHECK (vboard_api.leads(id));
CREATE POLICY member_select ON public.community_member FOR SELECT TO vboard_app USING (user_id=vboard_api.actor_id() OR vboard_api.leads(community_id));
CREATE POLICY member_insert ON public.community_member FOR INSERT TO vboard_app WITH CHECK (vboard_api.leads(community_id));
CREATE POLICY member_update ON public.community_member FOR UPDATE TO vboard_app USING (vboard_api.leads(community_id)) WITH CHECK (vboard_api.leads(community_id));
CREATE POLICY post_select ON public.post FOR SELECT TO vboard_app USING (vboard_api.operates(community_id));
CREATE POLICY post_insert ON public.post FOR INSERT TO vboard_app WITH CHECK (vboard_api.operates(community_id));
CREATE POLICY post_update ON public.post FOR UPDATE TO vboard_app USING (vboard_api.operates(community_id)) WITH CHECK (vboard_api.operates(community_id));
CREATE POLICY registration_select ON public.registration FOR SELECT TO vboard_app USING (user_id=vboard_api.actor_id() OR vboard_api.event_operator(post_id));
CREATE POLICY registration_insert ON public.registration FOR INSERT TO vboard_app WITH CHECK (user_id=vboard_api.actor_id());
CREATE POLICY registration_update ON public.registration FOR UPDATE TO vboard_app USING (user_id=vboard_api.actor_id() OR vboard_api.event_operator(post_id))
  WITH CHECK (user_id=vboard_api.actor_id() OR vboard_api.event_operator(post_id));
CREATE POLICY audit_select ON public.audit_log FOR SELECT TO vboard_app USING (vboard_api.is_super_admin() OR vboard_api.operates(community_id));
CREATE POLICY audit_insert ON public.audit_log FOR INSERT TO vboard_app WITH CHECK
  (actor_id=vboard_api.actor_id() AND vboard_api.audit_allowed(target_type,target_id,community_id));
DO $ownership$
DECLARE fn record;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vboard_api' LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO vboard_guard',fn.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.signature);
  END LOOP;
END $ownership$;
GRANT EXECUTE ON FUNCTION vboard_api.actor_id(),vboard_api.is_super_admin(),vboard_api.leads(uuid),vboard_api.operates(uuid),
  vboard_api.event_operator(uuid),vboard_api.visible(uuid),vboard_api.visible_posts(),vboard_api.post_detail(text),
  vboard_api.operational_posts(),vboard_api.event_seats(uuid),vboard_api.registration_history(text),
  vboard_api.community_summaries(),vboard_api.platform_counts(),vboard_api.event_attendees(uuid),
  vboard_api.community_members(uuid),vboard_api.person_by_email(text,uuid),vboard_api.people(text,integer),
  vboard_api.audit_entries(integer),vboard_api.pending_registrations(),vboard_api.registration_event(uuid),vboard_api.audit_allowed(text,text,uuid),vboard_api.published_counts(timestamptz,timestamptz) TO vboard_app;
REVOKE ALL ON SCHEMA vboard_private FROM vboard_app,vboard_auth;
REVOKE ALL ON ALL TABLES IN SCHEMA vboard_private FROM PUBLIC,vboard_app,vboard_auth;
