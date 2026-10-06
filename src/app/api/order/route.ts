// A market order on the Binance Spot Testnet, signed on the server. The amount is in
// USDT (quoteOrderQty), so "buy 100" spends 100 USDT and "sell 100" sells 100 USDT's worth.
import { signed, type Fill } from "@/lib/testnet";

export async function POST(req: Request) {
  const { symbol, side, usdt } = (await req.json()) as { symbol?: string; side?: string; usdt?: number };
  if (!symbol || !/^[A-Z]{2,12}USDT$/.test(symbol) || (side !== "BUY" && side !== "SELL") || !(Number(usdt) > 0)) {
    return Response.json({ error: "symbol, side (BUY or SELL) and a positive usdt amount are needed" }, { status: 400 });
  }
  try {
    const f = await signed<Fill & { status: string }>("/order", { symbol, side, type: "MARKET", quoteOrderQty: Number(usdt).toFixed(2) }, "POST");
    return Response.json({ orderId: f.orderId, status: f.status, qty: Number(f.executedQty), usdt: Number(f.cummulativeQuoteQty) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
