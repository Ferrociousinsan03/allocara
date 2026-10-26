import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { pageMeta } from "@/lib/metadata";
export const Route = createFileRoute("/auth")({ head: () => ({ meta: pageMeta("Sign in — Allocara", "Sign in to your Allocara account and return to your private portfolio and goals.") }), component: () => <AuthForm /> });