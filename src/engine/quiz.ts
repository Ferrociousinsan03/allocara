// Risk comfort quiz (spec section 9): 5 questions, answers scored 1-4, total 5-20.
export const QUIZ: { q: string; answers: string[] }[] = [
  { q: "Your portfolio falls 20% in a month. You:", answers: ["Sell everything", "Sell some", "Wait", "Buy more"] },
  { q: "When will you need most of this money?", answers: ["Under 2 years", "2-5 years", "5-10 years", "Over 10 years"] },
  { q: "How stable is your income?", answers: ["Very uncertain", "Somewhat stable", "Stable", "Very stable"] },
  { q: "Your investing experience:", answers: ["None", "Little", "Some", "A lot"] },
  { q: "What matters more?", answers: ["Not losing money", "Mostly safety", "Balance", "Growth"] },
];

export interface ComfortResult {
  limit: number; // decimal
  label: string;
}

/** Total 5-20 maps to a comfort limit and label. The quiz is a rough guide. */
export function scoreToComfort(score: number): ComfortResult {
  if (score <= 8) return { limit: 0.08, label: "Cautious" };
  if (score <= 11) return { limit: 0.15, label: "Steady" };
  if (score <= 14) return { limit: 0.22, label: "Balanced" };
  if (score <= 17) return { limit: 0.3, label: "Growth" };
  return { limit: 0.4, label: "Bold" };
}
