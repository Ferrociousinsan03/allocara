import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "./AccountProvider";

export function AuthForm({ signup = false }: { signup?: boolean }) {
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgot, setForgot] = useState(false);
  useEffect(() => { if (!loading && user) void navigate({ to: "/account", replace: true }); }, [user, loading, navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (forgot) {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setNotice("If an account exists for this email, a password reset link is on its way.");
      } else if (signup) {
        const result = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth` } });
        if (result.error) throw result.error;
        if (!result.data.session) setNotice("Check your email to confirm your account, then sign in. Your portfolio will be saved after confirmation.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  };
  const social = async (provider: "google" | "lovable") => {
    setBusy(true); setError("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) throw result.error;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in. Please try again."); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen px-6 py-8 text-foreground">
    <div className="mx-auto max-w-6xl"><Button asChild variant="ghost"><Link to="/"><ArrowLeft /> Allocara</Link></Button></div>
    <section className="mx-auto max-w-sm py-12 sm:py-20">
      <p className="mb-3 text-sm text-primary">Allocara / Your portfolio</p>
      <h1 className="font-serif text-4xl">{forgot ? "Reset your password" : signup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{signup ? "Your portfolio. Your goals. Your next chapter." : forgot ? "Enter your account email." : "Pick up where you left off."}</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {signup && !forgot && <label className="block text-sm">Display name<Input className="mt-2" autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
        <label className="block text-sm">Email<Input className="mt-2" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        {!forgot && <div className="text-sm"><label htmlFor="account-password">Password</label><div className="relative mt-2"><Input id="account-password" type={visible ? "text" : "password"} className="pr-12" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div>{signup && <span className="mt-1 block text-xs text-muted-foreground">At least 8 characters</span>}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        <Button disabled={busy || loading} className="w-full" type="submit"><Mail />{busy ? "Please wait…" : forgot ? "Send reset link" : signup ? "Create account" : "Sign in"}</Button>
      </form>
      {!signup && <Button variant="link" className="mt-2 px-0" onClick={() => { setForgot(!forgot); setNotice(""); setError(""); }}>{forgot ? "Back to sign in" : "Forgot password?"}</Button>}
      {!forgot && <><div className="my-6 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-3"><Button variant="outline" className="w-full" disabled={busy} onClick={() => void social("google")}>Continue with Google</Button><Button className="lovable-auth-button w-full" disabled={busy} onClick={() => void social("lovable")}>Continue with Lovable</Button></div></>}
      <p className="mt-8 text-center text-sm text-muted-foreground">{signup ? "Already have an account?" : "New to Allocara?"} <Link className="text-primary underline" to={signup ? "/auth" : "/sign-up"}>{signup ? "Sign in" : "Sign up"}</Link></p>
      <div className="mt-6 text-center"><Button asChild variant="ghost" size="sm"><Link to="/analyze/overview">Continue without an account</Link></Button></div>
    </section>
  </main>;
}