DO $baseline$
BEGIN
  IF to_regclass('public.user') IS NULL THEN
    EXECUTE $legacy$
CREATE TYPE public.community_approval AS ENUM (
    'pending',
    'approved'
);

CREATE TYPE public.community_role AS ENUM (
    'lead',
    'manager',
    'volunteer',
    'advisor'
);

CREATE TYPE public.location_visibility AS ENUM (
    'public',
    'after_approval'
);

CREATE TYPE public.override_effect AS ENUM (
    'grant',
    'revoke'
);

CREATE TYPE public.post_status AS ENUM (
    'draft',
    'published',
    'cancelled',
    'completed',
    'hidden'
);

CREATE TYPE public.post_visibility AS ENUM (
    'public',
    'vit_only'
);

CREATE TYPE public.registration_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'attended',
    'no_show'
);

CREATE TYPE public.site_role AS ENUM (
    'admin',
    'student'
);

CREATE TABLE public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    community_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.community (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    logo_url text,
    cover_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    department text,
    approval_status public.community_approval DEFAULT 'approved'::public.community_approval NOT NULL
);

CREATE TABLE public.community_invite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    email text NOT NULL,
    role public.community_role NOT NULL,
    invited_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.community_member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    user_id text NOT NULL,
    role public.community_role DEFAULT 'volunteer'::public.community_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    added_by text,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_host (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id text NOT NULL,
    added_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.permission_override (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    role public.community_role,
    capability text NOT NULL,
    effect public.override_effect NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.post (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    community_id uuid NOT NULL,
    author_id text,
    title text NOT NULL,
    body text NOT NULL,
    image_url text,
    visibility public.post_visibility DEFAULT 'public'::public.post_visibility NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    status public.post_status DEFAULT 'draft'::public.post_status NOT NULL,
    is_event boolean DEFAULT false NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    location text,
    location_visibility public.location_visibility,
    registration_opens_at timestamp with time zone,
    registration_closes_at timestamp with time zone,
    capacity integer,
    requires_approval boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    advisor_approved_at timestamp with time zone,
    advisor_approved_by text
);

CREATE TABLE public.profile (
    user_id text NOT NULL,
    site_role public.site_role DEFAULT 'student'::public.site_role NOT NULL,
    roll_number text,
    department text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    admin_department text
);

CREATE TABLE public.registration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id text NOT NULL,
    status public.registration_status DEFAULT 'pending'::public.registration_status NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    checked_in_at timestamp with time zone,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.session (
    id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean NOT NULL,
    image text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community_invite
    ADD CONSTRAINT community_invite_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community_member
    ADD CONSTRAINT community_member_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community
    ADD CONSTRAINT community_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community
    ADD CONSTRAINT community_slug_unique UNIQUE (slug);

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.permission_override
    ADD CONSTRAINT permission_override_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_slug_unique UNIQUE (slug);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.registration
    ADD CONSTRAINT registration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);

CREATE INDEX audit_log_community_idx ON public.audit_log USING btree (community_id);

CREATE INDEX audit_log_created_idx ON public.audit_log USING btree (created_at);

CREATE INDEX community_invite_email_idx ON public.community_invite USING btree (email);

CREATE UNIQUE INDEX community_invite_unique ON public.community_invite USING btree (community_id, email);

CREATE UNIQUE INDEX community_member_unique ON public.community_member USING btree (community_id, user_id);

CREATE INDEX community_member_user_idx ON public.community_member USING btree (user_id);

CREATE UNIQUE INDEX event_host_unique ON public.event_host USING btree (post_id, user_id);

CREATE INDEX event_host_user_idx ON public.event_host USING btree (user_id);

CREATE INDEX permission_override_role_idx ON public.permission_override USING btree (role);

CREATE INDEX permission_override_user_idx ON public.permission_override USING btree (user_id);

CREATE INDEX post_community_idx ON public.post USING btree (community_id);

CREATE INDEX post_starts_at_idx ON public.post USING btree (starts_at);

CREATE INDEX post_status_idx ON public.post USING btree (status);

CREATE INDEX profile_roll_number_idx ON public.profile USING btree (roll_number);

CREATE UNIQUE INDEX registration_unique ON public.registration USING btree (post_id, user_id);

CREATE INDEX registration_user_idx ON public.registration USING btree (user_id);

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_user_id_fk FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.community
    ADD CONSTRAINT community_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.community_invite
    ADD CONSTRAINT community_invite_community_id_community_id_fk FOREIGN KEY (community_id) REFERENCES public.community(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_invite
    ADD CONSTRAINT community_invite_invited_by_user_id_fk FOREIGN KEY (invited_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.community_member
    ADD CONSTRAINT community_member_added_by_user_id_fk FOREIGN KEY (added_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.community_member
    ADD CONSTRAINT community_member_community_id_community_id_fk FOREIGN KEY (community_id) REFERENCES public.community(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.community_member
    ADD CONSTRAINT community_member_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_added_by_user_id_fk FOREIGN KEY (added_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_post_id_post_id_fk FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_host
    ADD CONSTRAINT event_host_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.permission_override
    ADD CONSTRAINT permission_override_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.permission_override
    ADD CONSTRAINT permission_override_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_advisor_approved_by_user_id_fk FOREIGN KEY (advisor_approved_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_author_id_user_id_fk FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_community_id_community_id_fk FOREIGN KEY (community_id) REFERENCES public.community(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.registration
    ADD CONSTRAINT registration_decided_by_user_id_fk FOREIGN KEY (decided_by) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.registration
    ADD CONSTRAINT registration_post_id_post_id_fk FOREIGN KEY (post_id) REFERENCES public.post(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.registration
    ADD CONSTRAINT registration_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;;
$legacy$;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'community_member' AND column_name = 'role') OR
      NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post' AND column_name = 'advisor_approved_by') OR
      (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'id') <> 'text' THEN
      RAISE EXCEPTION 'Incompatible legacy schema';
    END IF;
  END IF;
END
$baseline$;
