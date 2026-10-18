CREATE FUNCTION vboard_api.guard_registration() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE event public.post%ROWTYPE; actor text:=vboard_api.actor_id(); retry boolean; occupied integer; closes timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.post_id::text,0));
  SELECT * INTO event FROM public.post p WHERE p.id=NEW.post_id;
  IF NOT FOUND OR NOT event.is_event THEN RAISE EXCEPTION 'Registrations require an event'; END IF;
  IF TG_OP='UPDATE' AND (NEW.id,NEW.post_id,NEW.user_id) IS DISTINCT FROM (OLD.id,OLD.post_id,OLD.user_id) THEN
    RAISE EXCEPTION 'Registration identity is immutable' USING ERRCODE='42501'; END IF;
  retry:=TG_OP='INSERT' OR (TG_OP='UPDATE' AND OLD.status='cancelled' AND NEW.user_id=actor);
  IF retry THEN
    closes:=coalesce(event.registration_closes_at,event.ends_at,event.starts_at);
    IF NEW.user_id IS DISTINCT FROM actor OR NOT vboard_api.visible(event.id) OR
      (event.registration_opens_at IS NOT NULL AND clock_timestamp()<event.registration_opens_at) OR
      (closes IS NOT NULL AND clock_timestamp()>closes) OR
      NEW.status::text IS DISTINCT FROM (CASE WHEN event.requires_approval THEN 'pending' ELSE 'approved' END) OR
      NEW.decided_by IS NOT NULL OR NEW.decided_at IS NOT NULL OR NEW.checked_in_at IS NOT NULL THEN
      RAISE EXCEPTION 'Registration is not available' USING ERRCODE='42501'; END IF;
    NEW.registered_at=clock_timestamp();
  ELSIF NEW.user_id=actor AND OLD.status IN ('pending','approved') AND NEW.status='cancelled' THEN
    IF (NEW.decided_by,NEW.decided_at,NEW.checked_in_at,NEW.registered_at) IS DISTINCT FROM
      (OLD.decided_by,OLD.decided_at,OLD.checked_in_at,OLD.registered_at) THEN
      RAISE EXCEPTION 'Cancellation provenance is immutable' USING ERRCODE='42501'; END IF;
  ELSE
    IF NOT vboard_api.event_operator(NEW.post_id) OR NEW.registered_at IS DISTINCT FROM OLD.registered_at OR
      NEW.decided_by IS DISTINCT FROM actor OR NOT (
        (OLD.status IN ('pending','rejected') AND NEW.status='approved') OR
        (OLD.status IN ('pending','approved') AND NEW.status='rejected') OR
        (OLD.status IN ('approved','no_show') AND NEW.status='attended') OR
        (OLD.status='approved' AND NEW.status='no_show') OR
        (OLD.status IN ('attended','no_show') AND NEW.status='approved')) THEN
      RAISE EXCEPTION 'Registration transition denied' USING ERRCODE='42501'; END IF;
    NEW.decided_by=actor; NEW.decided_at=clock_timestamp();
    NEW.checked_in_at=CASE WHEN NEW.status='attended' THEN clock_timestamp() ELSE NULL END;
  END IF;
  IF NEW.status IN ('approved','attended') AND (TG_OP='INSERT' OR OLD.status NOT IN ('approved','attended')) THEN
    SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.post_id
      AND r.status IN ('approved','attended') AND r.id<>NEW.id;
    IF event.capacity IS NOT NULL AND occupied>=event.capacity THEN RAISE EXCEPTION 'Event is full' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
ALTER FUNCTION vboard_api.guard_registration() OWNER TO vboard_guard;
REVOKE ALL ON FUNCTION vboard_api.guard_registration() FROM PUBLIC,vboard_app,vboard_auth;
CREATE TRIGGER registration_guard BEFORE INSERT OR UPDATE ON public.registration FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_registration();
CREATE TRIGGER registration_updated BEFORE INSERT OR UPDATE ON public.registration FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
