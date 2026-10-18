CREATE FUNCTION vboard_api.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
CREATE FUNCTION vboard_api.guard_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM vboard_api.actor_id() THEN RAISE EXCEPTION 'Profile access denied' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Profile identity is immutable' USING ERRCODE='42501'; END IF;
  IF TG_OP='INSERT' THEN NEW.created_at=clock_timestamp(); END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION vboard_api.guard_community() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NOT vboard_api.is_super_admin() OR NEW.created_by IS DISTINCT FROM vboard_api.actor_id() THEN
      RAISE EXCEPTION 'Community creation denied' USING ERRCODE='42501'; END IF;
    NEW.created_at=clock_timestamp();
  ELSE
    IF (NEW.id,NEW.slug,NEW.created_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.slug,OLD.created_by,OLD.created_at) THEN
      RAISE EXCEPTION 'Community identity is immutable' USING ERRCODE='42501'; END IF;
    IF NOT vboard_api.is_super_admin() AND (NOT vboard_api.leads(OLD.id) OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
      RAISE EXCEPTION 'Community change denied' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION vboard_api.guard_member() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id,NEW.community_id,NEW.user_id,NEW.joined_at) IS DISTINCT FROM
    (OLD.id,OLD.community_id,OLD.user_id,OLD.joined_at) THEN
    RAISE EXCEPTION 'Membership identity is immutable' USING ERRCODE='42501'; END IF;
  IF NOT vboard_api.is_super_admin() THEN
    IF NOT vboard_api.leads(NEW.community_id) OR NEW.role='lead' OR (TG_OP='UPDATE' AND OLD.role='lead') THEN
      RAISE EXCEPTION 'Membership change denied' USING ERRCODE='42501'; END IF;
  END IF;
  IF NEW.added_by IS DISTINCT FROM vboard_api.actor_id() THEN
    RAISE EXCEPTION 'Membership actor mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id=NEW.user_id AND u.email_verified AND lower(u.email) LIKE '%@vit.edu.in') THEN
    RAISE EXCEPTION 'Invalid member'; END IF;
  IF TG_OP='INSERT' THEN NEW.joined_at=clock_timestamp(); END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION vboard_api.guard_post() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE occupied integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,0));
  IF NOT vboard_api.operates(NEW.community_id) THEN RAISE EXCEPTION 'Post access denied' USING ERRCODE='42501'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.author_id IS DISTINCT FROM vboard_api.actor_id() THEN RAISE EXCEPTION 'Author mismatch' USING ERRCODE='42501'; END IF;
    NEW.created_at=clock_timestamp();
  ELSE
    IF (NEW.id,NEW.community_id,NEW.author_id,NEW.created_at,NEW.slug) IS DISTINCT FROM
      (OLD.id,OLD.community_id,OLD.author_id,OLD.created_at,OLD.slug) THEN
      RAISE EXCEPTION 'Post identity is immutable' USING ERRCODE='42501'; END IF;
    IF NOT NEW.is_event AND EXISTS (SELECT 1 FROM public.registration r WHERE r.post_id=NEW.id) THEN
      RAISE EXCEPTION 'An event with registrations cannot become an announcement'; END IF;
  END IF;
  SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.id AND r.status IN ('approved','attended');
  IF NEW.capacity IS NOT NULL AND NEW.capacity < occupied THEN RAISE EXCEPTION 'Capacity is below occupied seats'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_guard BEFORE INSERT OR UPDATE ON public.profile FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_profile();
CREATE TRIGGER community_guard BEFORE INSERT OR UPDATE ON public.community FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_community();
CREATE TRIGGER member_guard BEFORE INSERT OR UPDATE ON public.community_member FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_member();
CREATE TRIGGER post_guard BEFORE INSERT OR UPDATE ON public.post FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_post();
CREATE TRIGGER profile_updated BEFORE INSERT OR UPDATE ON public.profile FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
CREATE TRIGGER community_updated BEFORE INSERT OR UPDATE ON public.community FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
CREATE TRIGGER member_updated BEFORE INSERT OR UPDATE ON public.community_member FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
CREATE TRIGGER post_updated BEFORE INSERT OR UPDATE ON public.post FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
