// The 5-question comfort quiz (spec section 9). A rough guide; the slider can override it.
import { useState } from "react";
import { QUIZ, scoreToComfort } from "@/engine/quiz";
import { formatPct } from "@/engine/format";
import { useAnalyser } from "./state";

export function QuizButton() {
  const { update } = useAnalyser();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
  const [result, setResult] = useState<{ limit: number; label: string } | null>(null);

  const score = answers.reduce<number>((s, a) => s + (a ?? 0), 0);
  const complete = answers.every((a) => a !== null);

  const finish = () => {
    const r = scoreToComfort(score);
    setResult(r);
    update({ comfortLimit: r.limit });
  };

  const close = () => {
    setOpen(false);
    setAnswers(Array(QUIZ.length).fill(null));
    setResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-ivory/40 px-3 py-1.5 text-xs font-medium text-ivory hover:bg-bg-2"
      >
        Find my comfort level
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 p-4" role="dialog" aria-modal="true" aria-label="Comfort with loss quiz">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-bg-1 p-5">
            <h2 className="font-serif text-lg text-ivory">How much loss can you live with?</h2>
            <p className="mt-1 text-xs text-ivory-faint">Five quick questions. This is a rough guide, not a measurement — you can override the result with the slider.</p>
            <div className="mt-4 space-y-4">
              {QUIZ.map((q, qi) => (
                <fieldset key={qi}>
                  <legend className="text-sm font-medium text-ivory">{qi + 1}. {q.q}</legend>
                  <div className="mt-2 grid gap-1.5">
                    {q.answers.map((a, ai) => (
                      <label key={ai} className="flex items-center gap-2 rounded-md border border-line bg-bg-2 px-3 py-1.5 text-xs text-ivory-dim has-checked:border-emerald has-checked:text-ivory">
                        <input
                          type="radio"
                          name={`q${qi}`}
                          checked={answers[qi] === ai + 1}
                          onChange={() => setAnswers((prev) => prev.map((x, j) => (j === qi ? ai + 1 : x)))}
                          className="accent-emerald"
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            {result && (
              <p className="mt-4 rounded-lg border border-emerald/50 bg-bg-2 p-3 text-sm text-ivory">
                Your answers suggest <strong>{result.label}</strong>: a biggest acceptable loss of about{" "}
                <span className="num">{formatPct(result.limit, 0)}</span>. The slider has been set to this — change it any time.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={close} className="rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory">
                Close
              </button>
              {!result && (
                <button
                  type="button"
                  onClick={finish}
                  disabled={!complete}
                  className="rounded-md bg-emerald px-3 py-1.5 text-xs font-medium text-bg-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  See my comfort level
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
