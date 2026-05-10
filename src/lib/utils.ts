import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatUsdRange(range: { low: number; high: number }) {
  return `$${formatInteger(range.low)}-${formatInteger(range.high)}/day`;
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function formatInteger(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
