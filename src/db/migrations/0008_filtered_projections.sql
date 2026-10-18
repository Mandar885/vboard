CREATE FUNCTION vboard_api.feed_posts(community_id uuid DEFAULT NULL) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p
  WHERE vboard_api.visible(p.id) AND (feed_posts.community_id IS NULL OR p.community_id=feed_posts.community_id)
  ORDER BY p.is_pinned DESC,p.created_at DESC,p.id LIMIT 100
$$;
CREATE FUNCTION vboard_api.calendar_events() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p
  WHERE p.is_event AND vboard_api.visible(p.id)
  ORDER BY p.starts_at,p.id
$$;
CREATE FUNCTION vboard_api.community_posts(community_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT vboard_api.operates(community_id) THEN RAISE EXCEPTION 'Community access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT vboard_api.post_projection(p.id) FROM public.post p
    WHERE p.community_id=community_posts.community_id AND p.is_active ORDER BY p.created_at DESC,p.id;
END $$;
CREATE FUNCTION vboard_api.dashboard_events(search text,community_slug text,event_when text,event_status public.post_status,at_time timestamptz) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF event_when NOT IN ('all','upcoming','past') OR event_when IS NULL OR at_time IS NULL THEN
    RAISE EXCEPTION 'Invalid event filter' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT vboard_api.post_projection(p.id) FROM public.post p JOIN public.community c ON c.id=p.community_id
    WHERE p.is_event AND p.is_active AND (vboard_api.visible(p.id) OR vboard_api.operates(p.community_id))
      AND (community_slug IS NULL OR c.slug=community_slug)
      AND (event_status IS NULL OR p.status=event_status)
      AND (coalesce(trim(search),'')='' OR strpos(lower(p.title),lower(trim(search)))>0)
      AND (event_when='all' OR (event_when='upcoming' AND coalesce(p.ends_at,p.starts_at)>=at_time)
        OR (event_when='past' AND coalesce(p.ends_at,p.starts_at)<at_time))
    ORDER BY CASE WHEN event_when='past' THEN p.starts_at END DESC,
      CASE WHEN event_when<>'past' THEN p.starts_at END,p.id LIMIT 200;
END $$;
CREATE FUNCTION vboard_api.upcoming_events(community_ids uuid[],at_time timestamptz) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p
  WHERE p.community_id=ANY(community_ids) AND vboard_api.operates(p.community_id) AND p.is_active
    AND p.is_event AND p.status IN ('draft','published') AND coalesce(p.ends_at,p.starts_at)>=at_time
  ORDER BY p.starts_at,p.id LIMIT 10
$$;
CREATE FUNCTION vboard_api.scoped_pending_registrations(community_ids uuid[]) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('id',r.id,'registeredAt',r.registered_at,'name',u.name,'postId',p.id,
    'title',p.title,'communityId',c.id,'communitySlug',c.slug)
  FROM public.registration r JOIN public.post p ON p.id=r.post_id JOIN public.community c ON c.id=p.community_id
    JOIN public."user" u ON u.id=r.user_id
  WHERE p.community_id=ANY(community_ids) AND r.status='pending' AND vboard_api.event_operator(p.id)
  ORDER BY r.registered_at,r.id LIMIT 20
$$;
ALTER FUNCTION vboard_api.feed_posts(uuid) OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.calendar_events() OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.community_posts(uuid) OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.dashboard_events(text,text,text,public.post_status,timestamptz) OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.upcoming_events(uuid[],timestamptz) OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.scoped_pending_registrations(uuid[]) OWNER TO vboard_guard;
REVOKE ALL ON FUNCTION vboard_api.feed_posts(uuid),vboard_api.calendar_events(),vboard_api.community_posts(uuid),
  vboard_api.dashboard_events(text,text,text,public.post_status,timestamptz),vboard_api.upcoming_events(uuid[],timestamptz),
  vboard_api.scoped_pending_registrations(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vboard_api.feed_posts(uuid),vboard_api.calendar_events(),vboard_api.community_posts(uuid),
  vboard_api.dashboard_events(text,text,text,public.post_status,timestamptz),vboard_api.upcoming_events(uuid[],timestamptz),
  vboard_api.scoped_pending_registrations(uuid[]) TO vboard_app;
DROP FUNCTION vboard_api.visible_posts();
DROP FUNCTION vboard_api.operational_posts();
DROP FUNCTION vboard_api.pending_registrations();
