import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { pageMeta } from "@/lib/metadata";
export const Route = createFileRoute("/sign-up")({ head: () => ({ meta: pageMeta("Create an account — Allocara", "Create your Allocara account with a basic profile and private saved portfolio settings.") }), component: () => <AuthForm signup /> });