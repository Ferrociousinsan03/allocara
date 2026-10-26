import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";
import { useAccount } from "@/components/AccountProvider";
import { Button } from "@/components/ui/button";
import { PlainWordsDialog } from "@/components/analyser/PlainWordsDialog";

const Context = createContext<(() => void) | null>(null);
export function usePageAssistant() {
  const open = useContext(Context);
  if (!open) throw new Error("PageAssistantProvider is required");
  return open;
}
export function PageAssistantProvider({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: state => state.location.pathname });
  const { user } = useAccount();
  const session = `${path}:${user?.id ?? "guest"}`;
  const [openSession, setOpenSession] = useState<string | null>(null);
  useEffect(() => { setOpenSession(null); }, [session]);
  const open = openSession === session;
  return <Context.Provider value={() => setOpenSession(session)}>
    {children}
    {!path.startsWith("/analyze") && <div data-page-assistant className="fixed bottom-4 right-4 z-40 no-print"><Button onClick={() => setOpenSession(session)} className="gap-2" aria-label="Plain-words summary"><MessageSquareText className="h-4 w-4" /><span>Plain words</span></Button></div>}
    {open && <PlainWordsDialog key={session} path={path} onClose={() => setOpenSession(null)} />}
  </Context.Provider>;
}