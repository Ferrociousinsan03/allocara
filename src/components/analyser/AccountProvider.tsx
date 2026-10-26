import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AccountContext { user: User | null; loading: boolean; recovery: boolean; signOut: () => Promise<void> }
const Context = createContext<AccountContext | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const refresh = async () => {
      const current = ++revision;
      const { data } = await supabase.auth.getUser();
      if (alive && current === revision) { setUser(data.user); setLoading(false); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) return;
      if (event === "SIGNED_OUT") {
        revision++; setUser(null); setLoading(false);
      } else { window.setTimeout(() => void refresh(), 0); queryClient.invalidateQueries(); }
      void router.invalidate();
    });
    void refresh();
    return () => { alive = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    sessionStorage.removeItem("allocara-pending-portfolio");
    await navigate({ to: "/auth", replace: true });
  };
  return <Context.Provider value={{ user, loading, recovery, signOut }}>{children}</Context.Provider>;
}

export function useAccount() {
  const context = useContext(Context);
  if (!context) throw new Error("AccountProvider is required");
  return context;
}