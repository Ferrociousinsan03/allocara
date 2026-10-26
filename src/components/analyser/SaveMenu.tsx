// Save/Share menu (spec section 12): localStorage save/load + JSON export/import.
import { useRef, useState } from "react";
import { ChevronDown, Download, FolderOpen, Save, Upload, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareHash } from "@/lib/share";
import { exportJson, importJson, loadFromLocal, saveToLocal } from "@/lib/persistence";
import { useAnalyser } from "./state";
import { useAccount } from "@/components/AccountProvider";

export function SaveMenu() {
  const { state, replaceState, saveNow } = useAnalyser();
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const copyLink = async () => {
    const link = `${window.location.origin}/analyze/overview#${shareHash(state)}`;
    setShareLink(link);
    try { await navigator.clipboard.writeText(link); flash("Link copied. Anyone with it can see these settings."); }
    catch { flash("Select and copy the link below."); }
    setOpen(false);
  };

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2500);
  };

  const onSave = () => {
    flash(saveToLocal(state) ? "Saved in this browser." : "Saving is blocked in this browser.");
    setOpen(false);
  };

  const onLoad = () => {
    const s = loadFromLocal();
    if (s) {
      replaceState(s);
      flash("Loaded your saved settings.");
    } else {
      flash("Nothing saved yet.");
    }
    setOpen(false);
  };

  const onExport = () => {
    const blob = new Blob([exportJson(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocara-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const onImportFile = async (file: File) => {
    const s = importJson(await file.text());
    if (s) {
      replaceState(s);
      flash("Settings imported.");
    } else {
      flash("That file is not a valid Allocara export.");
    }
    setOpen(false);
  };

  const item = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-ivory-dim hover:bg-bg-2 hover:text-ivory";

  return (
    <div className="relative">
      <Button variant="outline" size="sm"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory"
      >
        Save / Share <ChevronDown className="h-3 w-3" aria-hidden />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-52 rounded-lg border border-line bg-bg-1 p-1 shadow-xl shadow-black/40">
          <Button variant="ghost" role="menuitem" className={item} onClick={() => void copyLink()}><LinkIcon /> Copy shareable link</Button>
          {user && <Button variant="ghost" role="menuitem" className={item} onClick={() => { void saveNow(); setOpen(false); }}><Save /> Save to my account</Button>}
          {!user && <Button variant="ghost" type="button" role="menuitem" className={item} onClick={onSave}>
            <Save className="h-3.5 w-3.5" aria-hidden /> Save in this browser
          </Button>}
          {!user && <Button variant="ghost" type="button" role="menuitem" className={item} onClick={onLoad}>
            <FolderOpen className="h-3.5 w-3.5" aria-hidden /> Load saved settings
          </Button>}
          <Button variant="ghost" type="button" role="menuitem" className={item} onClick={onExport}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export as JSON file
          </Button>
          <Button variant="ghost" type="button" role="menuitem" className={item} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> Import a JSON file
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import Allocara settings file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.target.value = "";
        }}
      />
      {shareLink && <div className="absolute right-0 z-40 mt-2 w-72 max-w-[80vw] rounded-md border border-line bg-bg-1 p-3">
        <p className="mb-2 text-xs text-ivory-dim">Anyone with this link can see your settings. Uploaded history is not included.</p>
        <input aria-label="Shareable link" readOnly value={shareLink} onFocus={(e) => e.target.select()} className="w-full rounded border border-line bg-bg-2 p-2 text-xs text-ivory" />
        <Button size="sm" variant="ghost" onClick={() => setShareLink(null)}>Close</Button>
      </div>}
      {note && (
        <p role="status" className="absolute right-0 top-full z-40 mt-1 w-max rounded-md border border-line bg-bg-2 px-2 py-1 text-[11px] text-ivory">
          {note}
        </p>
      )}
    </div>
  );
}
