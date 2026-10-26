import { useRef, useState } from "react";
import { Upload, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateHistoryCsv } from "@/engine/upload-history";
import { useAnalyser } from "./state";

export function HistoryUpload() {
  const { historyName, setUploadedHistory } = useAnalyser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = async (file: File) => {
    try {
      if (file.size > 1_000_000) throw new Error("Choose a CSV smaller than 1 MB.");
      setUploadedHistory(validateHistoryCsv(await file.text()), file.name);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read this CSV."); }
  };
  return <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Upload history CSV</Button>
    <Button size="sm" variant="ghost" asChild><a href="/data/monthly_returns.csv" download="allocara-history-sample.csv"><Download /> Sample CSV</a></Button>
    {historyName && <Button size="sm" variant="ghost" onClick={() => { setUploadedHistory(null); setError(null); }}><RotateCcw /> Restore bundled history</Button>}
    <span className="min-w-0 break-all text-xs text-ivory-faint">{historyName ? `Your history: ${historyName}` : "Bundled history"}</span>
    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Upload monthly history CSV" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} />
    {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
  </div>;
}