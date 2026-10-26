CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_allocara_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''), 100));
 RETURN NEW;
END;
$$;
CREATE TRIGGER allocara_profile_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_allocara_profile();
INSERT INTO public.profiles (id, display_name) SELECT id, left(coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', ''), 100) FROM auth.users ON CONFLICT (id) DO NOTHING;
CREATE TABLE public.user_portfolios (
 user_id uuid PRIMARY KEY,
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_portfolios TO authenticated;
GRANT ALL ON public.user_portfolios TO service_role;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own portfolio" ON public.user_portfolios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own portfolio" ON public.user_portfolios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own portfolio" ON public.user_portfolios FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own portfolio" ON public.user_portfolios FOR DELETE TO authenticated USING (user_id = auth.uid());