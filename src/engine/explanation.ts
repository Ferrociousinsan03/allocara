const numbers = (text: string) => text.match(/[+-]?\d+(?:,\d{3})*(?:\.\d+)?/g)?.map((n) => n.replaceAll(',', '').replace(/^\+/, '')) ?? [];

/** Discard invented numbers, numbered lists and explicit trading advice. */
export function safeExplanation(text: string, input: unknown): boolean {
  const allowed = new Set(numbers(JSON.stringify(input)));
  return text.trim().length > 0 && numbers(text).every((n) => allowed.has(n)) && !/\b(buy|sell|purchase)\b/i.test(text);
}