// Your testnet fills as a trade journal: spot buys open lots, sells close them first in,
// first out. A closed lot is a Win or a Loss on its own P&L; a lot still held is Open.
import { signed } from "@/lib/testnet";
import { SYMBOLS } from "@/lib/binance";

type T = { id: number; symbol: string; price: string; qty: string; quoteQty: string; time: number; isBuyer: boolean };

export async function GET() {
  try {
    const fills = (await Promise.all(SYMBOLS.map((symbol) => signed<T[]>("/myTrades", { symbol, limit: 100 })))).flat().sort((a, b) => a.time - b.time);
    const rows: Record<string, unknown>[] = [];
    const open = new Map<string, { id: number; qty: number; price: number; time: number }[]>();
    for (const f of fills) {
      const asset = f.symbol.replace(/USDT$/, "");
      const lots = open.get(asset) ?? [];
      if (f.isBuyer) { lots.push({ id: f.id, qty: +f.qty, price: +f.price, time: f.time }); open.set(asset, lots); continue; }
      let left = +f.qty;
      while (left > 1e-12 && lots.length) {
        const lot = lots[0], q = Math.min(lot.qty, left);
        const pnl = (+f.price - lot.price) * q;
        rows.push({ id: `${lot.id}-${f.id}`, at: new Date(lot.time).toISOString(), asset, side: "Long", qty: q, notional: q * lot.price, entry: lot.price, exit: +f.price, pnl, slippage: 0, holdMin: Math.round((f.time - lot.time) / 60000), status: pnl >= 0 ? "Win" : "Loss" });
        lot.qty -= q; left -= q;
        if (lot.qty <= 1e-12) lots.shift();
      }
    }
    for (const [asset, lots] of open) for (const lot of lots) rows.push({ id: String(lot.id), at: new Date(lot.time).toISOString(), asset, side: "Long", qty: lot.qty, notional: lot.qty * lot.price, entry: lot.price, exit: null, pnl: null, slippage: 0, holdMin: null, status: "Open" });
    rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return Response.json({ rows });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
