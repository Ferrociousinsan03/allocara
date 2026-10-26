REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
REVOKE ALL ON public.user_portfolios FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.user_portfolios FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_portfolios TO authenticated;