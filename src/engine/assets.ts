// Default asset assumptions (illustrative, editable). Section 7 of the spec.
export type AssetId = "LC" | "MC" | "GS" | "CB" | "GD" | "CA" | "US" | "LK";

export interface Asset {
  id: AssetId;
  name: string;
  expReturn: number; // yearly, decimal
  vol: number; // yearly, decimal
  beta: number;
  duration: number;
  convexity: number;
  fx: number; // 1 = moves with USD/INR
  liquid: number; // share sellable quickly
  disc: number; // sale discount in a crisis
  risky: boolean;
  equity: boolean;
}

export const ASSETS: Asset[] = [
  { id: "LC", name: "Large-cap shares (India)", expReturn: 0.12, vol: 0.17, beta: 1, duration: 0, convexity: 0, fx: 0, liquid: 1, disc: 0.02, risky: true, equity: true },
  { id: "MC", name: "Mid/small-cap shares", expReturn: 0.14, vol: 0.23, beta: 1.25, duration: 0, convexity: 0, fx: 0, liquid: 0.9, disc: 0.08, risky: true, equity: true },
  { id: "GS", name: "Government bonds", expReturn: 0.071, vol: 0.045, beta: 0, duration: 7.5, convexity: 70, fx: 0, liquid: 1, disc: 0, risky: false, equity: false },
  { id: "CB", name: "Corporate bonds", expReturn: 0.078, vol: 0.04, beta: 0.2, duration: 3.5, convexity: 15, fx: 0, liquid: 0.9, disc: 0.03, risky: false, equity: false },
  { id: "GD", name: "Gold (in rupees)", expReturn: 0.085, vol: 0.14, beta: -0.1, duration: 0, convexity: 0, fx: 1, liquid: 1, disc: 0.01, risky: false, equity: false },
  { id: "CA", name: "Cash / liquid funds / FD", expReturn: 0.065, vol: 0.005, beta: 0, duration: 0.3, convexity: 0, fx: 0, liquid: 1, disc: 0, risky: false, equity: false },
  { id: "US", name: "US shares fund (USD)", expReturn: 0.11, vol: 0.18, beta: 0.9, duration: 0, convexity: 0, fx: 1, liquid: 0.95, disc: 0.02, risky: true, equity: true },
  { id: "LK", name: "Locked-in / hard to sell (PPF, property fund)", expReturn: 0.075, vol: 0.06, beta: 0.2, duration: 2, convexity: 0, fx: 0, liquid: 0.1, disc: 0.2, risky: false, equity: false },
];

export const ASSET_IDS: AssetId[] = ASSETS.map((a) => a.id);

// Fixed-rule correlations, order LC, MC, GS, CB, GD, CA, US, LK.
const BASE7 = [
  [1, 0.88, -0.05, 0.15, 0, 0, 0.55],
  [0.88, 1, -0.1, 0.1, 0, 0, 0.5],
  [-0.05, -0.1, 1, 0.6, 0.1, 0.1, 0],
  [0.15, 0.1, 0.6, 1, 0.05, 0.1, 0.05],
  [0, 0, 0.1, 0.05, 1, 0, 0.05],
  [0, 0, 0.1, 0.1, 0, 1, 0],
  [0.55, 0.5, 0, 0.05, 0.05, 0, 1],
];
// LK: 0.1 with bonds, 0.2 with equities, 0 with the rest.
const LK_ROW = [0.2, 0.2, 0.1, 0.1, 0, 0, 0.2, 1];

export const FIXED_CORR: number[][] = [
  ...BASE7.map((row, i) => [...row, LK_ROW[i] ?? 0]),
  LK_ROW,
];

export type Weights = Record<AssetId, number>;

export function emptyWeights(): Weights {
  return Object.fromEntries(ASSET_IDS.map((id) => [id, 0])) as Weights;
}
