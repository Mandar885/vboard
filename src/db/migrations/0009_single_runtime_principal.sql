GRANT SELECT, INSERT, UPDATE, DELETE ON public."user", public.session, public.account, public.verification TO vboard_app;
REVOKE ALL ON public."user", public.session, public.account, public.verification FROM vboard_auth;
ALTER ROLE vboard_auth NOLOGIN PASSWORD NULL;
