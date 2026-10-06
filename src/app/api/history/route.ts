// What today's holdings were worth over time: each asset's balance now, priced at each
// past close. The account is new, so this is the honest history to show: change the
// holdings and the line changes with them.
import { signed, market, STABLE } from "@/lib/testnet";

type K = (string | number)[];
const WINDOWS = [
  { key: "24h", label: "24h", interval: "1h", limit: 25, length: 24, unit: "clock" },
  { key: "1w", label: "1w", interval: "4h", limit: 43, length: 7, unit: "d" },
  { key: "1m", label: "1m", interval: "1d", limit: 31, length: 30, unit: "d" },
  { key: "all", label: "All", interval: "1w", limit: 53, length: 52, unit: "w" },
] as const;

export async function GET() {
  try {
    const { balances } = await signed<{ balances: { asset: string; free: string; locked: string }[] }>("/account", { omitZeroBalances: "true" });
    const prices = new Map((await market<{ symbol: string; price: string }[]>("/ticker/price")).map((p) => [p.symbol, +p.price]));
    const held = balances.map((b) => ({ asset: b.asset, qty: +b.free + +b.locked }));
    const stable = held.filter((h) => STABLE.has(h.asset)).reduce((a, h) => a + h.qty, 0);
    // the 8 largest coins by value carry the line; the long tail is held at today's price
    const coins = held.filter((h) => !STABLE.has(h.asset) && prices.has(`${h.asset}USDT`)).map((h) => ({ ...h, usd: h.qty * prices.get(`${h.asset}USDT`)! })).sort((a, b) => b.usd - a.usd);
    const top = coins.slice(0, 8), tail = coins.slice(8).reduce((a, c) => a + c.usd, 0);
    const windows = await Promise.all(WINDOWS.map(async (w) => {
      const series = await Promise.all(top.map((c) => market<K[]>(`/klines?symbol=${c.asset}USDT&interval=${w.interval}&limit=${w.limit}`).then((ks) => ks.map((k) => +k[4] * c.qty))));
      // a coin listed later than the window's start is held at its first close before it
      const n = Math.max(...series.map((s) => s.length));
      const at = (s: number[], i: number) => s[Math.max(0, s.length - n + i)];
      const line = Array.from({ length: n }, (_, i) => stable + tail + series.reduce((a, s) => a + at(s, i), 0));
      return { key: w.key, label: w.label, series: line, length: w.length, unit: w.unit };
    }));
    return Response.json({ windows });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
