// The demo's indicator: a 9/21 EMA crossover on closing prices. The fast average
// crossing above the slow one is a BUY, crossing below is a SELL. Simple on
// purpose, so every signal on screen can be traced back to two numbers.
import type { Candle } from "./binance";

export type Signal = { time: number; side: "BUY" | "SELL"; price: number };

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

export function signals(candles: Candle[], fast = 9, slow = 21): Signal[] {
  const closes = candles.map((c) => c.close);
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const out: Signal[] = [];
  // skip the warm-up, where the slow average is still settling
  for (let i = slow; i < candles.length; i++) {
    const before = f[i - 1] - s[i - 1];
    const now = f[i] - s[i];
    if (before <= 0 && now > 0) out.push({ time: candles[i].time, side: "BUY", price: candles[i].close });
    if (before >= 0 && now < 0) out.push({ time: candles[i].time, side: "SELL", price: candles[i].close });
  }
  return out;
}

export const latest = (candles: Candle[]) => signals(candles).at(-1) ?? null;

export function ago(time: number): string {
  const h = Math.round((Date.now() - time) / 3_600_000);
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
