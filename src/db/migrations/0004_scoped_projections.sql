CREATE FUNCTION vboard_api.event_attendees(post_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT vboard_api.event_operator(post_id) THEN RAISE EXCEPTION 'Attendee access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',r.id,'status',r.status,'registeredAt',r.registered_at,
    'checkedInAt',r.checked_in_at,'userId',u.id,'name',u.name,'email',u.email,
    'rollNumber',p.roll_number,'department',p.department)
  FROM public.registration r JOIN public."user" u ON u.id=r.user_id LEFT JOIN public.profile p ON p.user_id=u.id
  WHERE r.post_id=event_attendees.post_id ORDER BY r.registered_at;
END $$;
CREATE FUNCTION vboard_api.community_members(community_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT vboard_api.leads(community_id) THEN RAISE EXCEPTION 'Team access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',m.id,'userId',u.id,'name',u.name,'email',u.email,
    'role',m.role,'isActive',m.is_active,'joinedAt',m.joined_at,'rollNumber',p.roll_number,'department',p.department)
  FROM public.community_member m JOIN public."user" u ON u.id=m.user_id LEFT JOIN public.profile p ON p.user_id=u.id
  WHERE m.community_id=community_members.community_id AND m.is_active ORDER BY m.role,u.name;
END $$;
CREATE FUNCTION vboard_api.person_by_email(email text, community_id uuid DEFAULT NULL) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT vboard_api.is_super_admin() AND (community_id IS NULL OR NOT vboard_api.leads(community_id)) THEN
    RAISE EXCEPTION 'Delegation access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',u.id,'name',u.name,'email',u.email) FROM public."user" u
    WHERE lower(u.email)=lower(trim(person_by_email.email)) AND u.email_verified AND lower(u.email) LIKE '%@vit.edu.in';
END $$;
CREATE FUNCTION vboard_api.people(search text, row_limit integer) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT vboard_api.is_super_admin() THEN RAISE EXCEPTION 'People access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'createdAt',u.created_at,
    'siteRole',CASE WHEN EXISTS (SELECT 1 FROM vboard_private.super_admin_email e WHERE e.email=lower(u.email))
      THEN 'super_admin' ELSE 'student' END,'rollNumber',p.roll_number,'department',p.department)
  FROM public."user" u LEFT JOIN public.profile p ON p.user_id=u.id WHERE search='' OR
    u.name ILIKE '%'||search||'%' OR u.email ILIKE '%'||search||'%' OR p.roll_number ILIKE '%'||search||'%'
  ORDER BY u.name LIMIT greatest(1,least(row_limit,100));
END $$;
CREATE FUNCTION vboard_api.audit_entries(row_limit integer) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object('id',a.id,'action',a.action,'targetType',a.target_type,'targetId',a.target_id,
    'details',a.details,'createdAt',a.created_at,'actorName',u.name,'actorEmail',u.email)
  FROM public.audit_log a LEFT JOIN public."user" u ON u.id=a.actor_id
  WHERE vboard_api.is_super_admin() OR (a.community_id IS NOT NULL AND vboard_api.operates(a.community_id))
  ORDER BY a.created_at DESC LIMIT greatest(1,least(row_limit,200))
$$;
CREATE FUNCTION vboard_api.pending_registrations() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object('id',r.id,'registeredAt',r.registered_at,'name',u.name,'postId',p.id,
    'title',p.title,'communityId',c.id,'communitySlug',c.slug)
  FROM public.registration r JOIN public.post p ON p.id=r.post_id JOIN public.community c ON c.id=p.community_id
    JOIN public."user" u ON u.id=r.user_id
  WHERE r.status='pending' AND vboard_api.event_operator(p.id) ORDER BY r.registered_at LIMIT 100
$$;
CREATE FUNCTION vboard_api.registration_event(post_id uuid) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('communityId',p.community_id,'requiresApproval',p.requires_approval)
  FROM public.post p WHERE p.id=registration_event.post_id AND p.is_event AND
    (vboard_api.visible(p.id) OR vboard_api.event_operator(p.id) OR EXISTS
      (SELECT 1 FROM public.registration r WHERE r.post_id=p.id AND r.user_id=vboard_api.actor_id()))
$$;
CREATE FUNCTION vboard_api.audit_allowed(target_type text,target_id text,community_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT vboard_api.is_super_admin() OR
    (audit_allowed.target_type='profile' AND audit_allowed.target_id=vboard_api.actor_id() AND audit_allowed.community_id IS NULL) OR
    (audit_allowed.target_type='community' AND audit_allowed.target_id=audit_allowed.community_id::text AND vboard_api.leads(audit_allowed.community_id)) OR
    (audit_allowed.target_type='member' AND EXISTS (SELECT 1 FROM public.community_member m WHERE m.id::text=audit_allowed.target_id AND m.community_id=audit_allowed.community_id AND vboard_api.leads(m.community_id))) OR
    (audit_allowed.target_type='post' AND EXISTS (SELECT 1 FROM public.post p WHERE p.id::text=audit_allowed.target_id AND p.community_id=audit_allowed.community_id AND vboard_api.operates(p.community_id))) OR
    (audit_allowed.target_type='registration' AND EXISTS (SELECT 1 FROM public.registration r JOIN public.post p ON p.id=r.post_id WHERE r.id::text=audit_allowed.target_id
      AND p.community_id=audit_allowed.community_id AND (r.user_id=vboard_api.actor_id() OR vboard_api.event_operator(p.id))))
$$;
