import { createFileRoute,Link,Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountLinks } from '@/components/AccountLinks';
import { pageMeta } from '@/lib/metadata';
export const Route=createFileRoute('/tools')({head:()=>({meta:pageMeta('Investment tools — Allocara','Plan savings, research investments, and keep private investment records using your own data.')}),component:ToolsLayout});
function ToolsLayout(){return <div className="min-h-screen text-foreground"><header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 no-print"><Button variant="ghost" asChild><Link to="/"><ArrowLeft/> Allocara</Link></Button><div className="flex flex-wrap items-center gap-3"><Button asChild variant="outline"><Link to="/tools">All tools</Link></Button><AccountLinks/></div></header><main className="mx-auto max-w-7xl px-6 py-10 sm:py-12"><Outlet/></main><footer className="mx-auto max-w-7xl border-t border-border px-6 py-6 text-xs text-muted-foreground">Educational tools, not financial or tax advice. No sample holdings or invented market data.</footer></div>;}
