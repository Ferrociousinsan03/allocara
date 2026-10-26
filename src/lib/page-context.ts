import type { PageQuestion } from "@/engine/page-assistant";

const privatePage = (path: string) => /^\/(account|auth|signup|reset-password)(\/|$)/.test(path);
export function captureCurrentPage(doc: Document, path: string): PageQuestion["page"] {
  const source = doc.querySelector("main") ?? doc.body;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script,style,iframe,nav,header,footer,[role="dialog"],[data-page-assistant],input,textarea,select,[hidden],[aria-hidden="true"],[data-ai-private]').forEach(el => el.remove());
  let content: string;
  if (privatePage(path)) {
    // Account/auth pages explain their sections without sending saved identities or form values.
    content = Array.from(source.querySelectorAll("h1,h2,h3,label")).filter(el => !el.closest('[role="dialog"],[data-ai-private]')).map(el => el.textContent ?? "").join("\n");
    content += "\nPrivate account values are not shared with this helper.";
  } else {
    content = clone.innerText || clone.textContent || "";
    const values = Array.from(source.querySelectorAll<HTMLInputElement>('input[type="number"],input[type="range"]'))
      .filter(el => !el.closest('[role="dialog"],[data-ai-private]'))
      .flatMap(el => {
        const label = el.getAttribute("aria-label") || el.labels?.[0]?.textContent?.trim();
        return label && el.value ? [`${label}: ${el.value}`] : [];
      });
    content += `\n${values.join("\n")}`;
  }
  const clean = (text: string) => text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[private email]").replace(/(?:Bearer\s+\S+|(?:sb_secret_|sk-)[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)/g, "[private credential]").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
  return { path, title: clean(source.querySelector("h1")?.textContent || doc.title).slice(0, 180), content: clean(content).slice(0, 18000) || "This page has no readable content yet." };
}