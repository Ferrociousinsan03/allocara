import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut, Save } from "lucide-react";
import { useAccount } from "@/components/AccountProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageMeta } from "@/lib/metadata";
import { AnalyserProvider } from "@/components/analyser/state";
import { InvestorForm } from "@/components/InvestorForm";
export const Route = createFileRoute("/account")({ head: () => ({ meta: pageMeta("My account — Allocara", "Manage your Allocara profile and private portfolio account.") }), component: AccountPage });
function AccountPage() {
  const { user, loading, signOut } = useAccount();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = useQuery({ queryKey: ["profile", user?.id], enabled: !!user, queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    if (error) throw error; return data;
  } });
  useEffect(() => { setName(profile.data?.display_name ?? ""); }, [profile.data]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (!user) return;
    setBusy(true); setNote("");
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    setBusy(false); setNote(error ? error.message : "Profile saved.");
    if (!error) void client.invalidateQueries({ queryKey: ["profile", user.id] });
  }
  return <main className="mx-auto max-w-6xl px-6 py-12"><Button asChild variant="ghost"><Link to="/analyze/overview"><ArrowLeft /> Allocara</Link></Button><h1 className="mt-10 font-serif text-4xl">My account & portfolio</h1>{loading ? <p className="mt-6">Loading account…</p> : !user ? <div className="mt-8"><Button asChild><Link to="/auth">Sign in to your account</Link></Button><Button asChild variant="outline" className="ml-3"><Link to="/sign-up">Create account</Link></Button></div> : <>
    <p className="mt-4 break-all text-muted-foreground">{user.email}</p>
    {profile.error && <p role="alert" className="mt-4 text-destructive">Could not load your profile. Please try again.</p>}
    <form onSubmit={save} className="mt-8 space-y-4"><label className="block text-sm">Display name<Input className="mt-2" value={name} maxLength={100} required onChange={e => setName(e.target.value)} /></label><Button disabled={busy || profile.isLoading || !!profile.error} type="submit"><Save /> Save profile</Button></form>
    <AnalyserProvider key={user.id}><InvestorForm /></AnalyserProvider>
    <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6"><Button asChild variant="outline"><Link to="/analyze/overview">Open my portfolio</Link></Button><Button asChild variant="outline"><Link to="/tools">Investment tools</Link></Button><Button asChild variant="ghost"><Link to="/tools/$tool" params={{tool:"privacy"}}>Manage stored data</Link></Button><Button variant="ghost" onClick={() => void signOut().catch(() => setNote("Could not sign out. Please try again."))}><LogOut /> Sign out</Button></div>
    {note && <p role="status" className="mt-4 text-sm">{note}</p>}
  </>}</main>;
}