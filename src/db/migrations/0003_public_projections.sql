CREATE FUNCTION vboard_api.post_projection(post_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object(
    'id',p.id,'slug',p.slug,'title',p.title,'body',p.body,'imageUrl',p.image_url,
    'visibility',p.visibility,'isPinned',p.is_pinned,'status',p.status,'isEvent',p.is_event,
    'isActive',p.is_active,'startsAt',p.starts_at,'endsAt',p.ends_at,
    'location',CASE WHEN p.location_visibility='public' OR vboard_api.operates(p.community_id)
      OR EXISTS (SELECT 1 FROM public.registration r WHERE r.post_id=p.id AND r.user_id=vboard_api.actor_id()
        AND r.status IN ('approved','attended')) THEN p.location ELSE NULL END,
    'locationVisibility',p.location_visibility,'registrationOpensAt',p.registration_opens_at,
    'registrationClosesAt',p.registration_closes_at,'capacity',p.capacity,'requiresApproval',p.requires_approval,
    'createdAt',p.created_at,'updatedAt',p.updated_at,'communityId',c.id,'communitySlug',c.slug,
    'communityName',c.name,'authorName',u.name,'authorImage',u.image,
    'seatsTaken',(SELECT count(*)::int FROM public.registration r WHERE r.post_id=p.id AND r.status IN ('approved','attended')),
    'pendingCount',CASE WHEN vboard_api.operates(p.community_id) THEN
      (SELECT count(*)::int FROM public.registration r WHERE r.post_id=p.id AND r.status='pending') ELSE 0 END)
  FROM public.post p JOIN public.community c ON c.id=p.community_id LEFT JOIN public."user" u ON u.id=p.author_id
  WHERE p.id=post_projection.post_id AND (vboard_api.visible(p.id) OR (p.is_active AND vboard_api.operates(p.community_id)))
$$;
CREATE FUNCTION vboard_api.visible_posts() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p WHERE vboard_api.visible(p.id)
  ORDER BY p.is_pinned DESC,p.created_at DESC LIMIT 200
$$;
CREATE FUNCTION vboard_api.post_detail(slug text) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p WHERE p.slug=post_detail.slug
    AND (vboard_api.visible(p.id) OR (p.is_active AND vboard_api.operates(p.community_id)))
$$;
CREATE FUNCTION vboard_api.operational_posts() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT vboard_api.post_projection(p.id) FROM public.post p
  WHERE p.is_active AND (vboard_api.visible(p.id) OR vboard_api.operates(p.community_id))
  ORDER BY p.created_at DESC LIMIT 500
$$;
CREATE FUNCTION vboard_api.event_seats(post_id uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT (SELECT count(*)::int FROM public.registration r WHERE r.post_id=p.id AND r.status IN ('approved','attended'))
  FROM public.post p WHERE p.id=event_seats.post_id AND p.is_event
    AND (vboard_api.visible(p.id) OR vboard_api.event_operator(p.id))
$$;
CREATE FUNCTION vboard_api.registration_history(user_id text) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF user_id IS DISTINCT FROM vboard_api.actor_id() AND NOT vboard_api.is_super_admin() THEN
    RAISE EXCEPTION 'History access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',r.id,'status',r.status,'registeredAt',r.registered_at,
    'checkedInAt',r.checked_in_at,'postId',p.id,'postSlug',p.slug,'title',p.title,
    'startsAt',p.starts_at,'endsAt',p.ends_at,'postStatus',p.status,'isActive',p.is_active,
    'communityName',c.name)
  FROM public.registration r JOIN public.post p ON p.id=r.post_id JOIN public.community c ON c.id=p.community_id
  WHERE r.user_id=registration_history.user_id ORDER BY p.starts_at DESC;
END $$;
CREATE FUNCTION vboard_api.community_summaries() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'description',c.description,
    'logoUrl',c.logo_url,'isActive',c.is_active,'createdBy',c.created_by,'createdAt',c.created_at,
    'postCount',(SELECT count(*)::int FROM public.post p WHERE p.community_id=c.id AND vboard_api.visible(p.id)),
    'eventCount',(SELECT count(*)::int FROM public.post p WHERE p.community_id=c.id AND p.is_event AND vboard_api.visible(p.id)),
    'teamCount',(SELECT count(*)::int FROM public.community_member m WHERE m.community_id=c.id AND m.is_active))
  FROM public.community c WHERE c.is_active OR vboard_api.is_super_admin() ORDER BY c.name
$$;
CREATE FUNCTION vboard_api.platform_counts() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT vboard_api.is_super_admin() THEN RAISE EXCEPTION 'Platform access denied' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('users',(SELECT count(*)::int FROM public."user"),
    'registrations',(SELECT count(*)::int FROM public.registration));
END $$;
CREATE FUNCTION vboard_api.published_counts(from_at timestamptz DEFAULT NULL,to_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('posts',count(*)::int,'events',count(*) FILTER (WHERE p.is_event)::int,
    'eventsBetween',count(*) FILTER (WHERE p.is_event AND p.starts_at>=from_at AND p.starts_at<=to_at)::int)
  FROM public.post p WHERE vboard_api.visible(p.id)
$$;
