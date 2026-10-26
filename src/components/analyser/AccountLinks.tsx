import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "./AccountProvider";

export function AccountLinks({ onBeforeAuth }: { onBeforeAuth?: () => void }) {
  const { user, loading } = useAccount();
  if (loading) return <span className="text-xs text-muted-foreground">Checking account…</span>;
  if (user) return <Button asChild variant="outline" size="sm"><Link to="/account"><UserRound /> My account</Link></Button>;
  return <div className="flex gap-2">
    <Button asChild variant="ghost" size="sm"><Link to="/auth" onClick={onBeforeAuth}>Sign in</Link></Button>
    <Button asChild variant="outline" size="sm"><Link to="/sign-up" onClick={onBeforeAuth}>Sign up</Link></Button>
  </div>;
}