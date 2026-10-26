CREATE TABLE public.investment_tool_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 kind text NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_tool_entries TO authenticated;
GRANT ALL ON public.investment_tool_entries TO service_role;
ALTER TABLE public.investment_tool_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their tool entries" ON public.investment_tool_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX investment_tool_entries_owner_kind ON public.investment_tool_entries(user_id, kind);
CREATE FUNCTION public.clear_my_allocara_data() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 DELETE FROM public.investment_tool_entries WHERE user_id = auth.uid();
 DELETE FROM public.user_portfolios WHERE user_id = auth.uid();
 UPDATE public.profiles SET display_name = '' WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.clear_my_allocara_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_allocara_data() TO authenticated;