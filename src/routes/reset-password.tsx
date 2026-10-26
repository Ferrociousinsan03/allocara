import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageMeta } from "@/lib/metadata";
import { useAccount } from "@/components/AccountProvider";
export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: pageMeta("Reset password — Allocara", "Choose a new password for your Allocara account using your recovery link.") }), component: ResetPassword });
function ResetPassword() {
  const { recovery } = useAccount();
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const hash = new URLSearchParams(window.location.hash.slice(1)); setValid(hash.get("type") === "recovery" || new URLSearchParams(window.location.search).get("type") === "recovery"); }, []);
  useEffect(() => { if (recovery) setValid(true); }, [recovery]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setNote("");
    if (password !== confirm) { setNote("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false); if (error) setNote(error.message); else { setDone(true); setNote("Your password has been updated."); }
  }
  return <main className="mx-auto max-w-sm px-6 py-20"><h1 className="font-serif text-3xl">New password</h1>{valid && !done ? <form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm">New password<Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block text-sm">Confirm new password<Input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label><Button disabled={busy} type="submit">Update password</Button></form> : <p className="mt-6 text-muted-foreground">{done ? "You can now continue to your portfolio." : "Open a valid password recovery link from your email."}</p>}{note && <p role="status" className="mt-4 text-sm">{note}</p>}<Button asChild variant="link" className="mt-6 px-0"><Link to={done ? "/analyze/overview" : "/auth"}>{done ? "Open my portfolio" : "Back to sign in"}</Link></Button></main>;
}