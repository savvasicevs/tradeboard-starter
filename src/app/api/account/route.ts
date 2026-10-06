// The Binance Spot Testnet account, signed on the server so the keys never reach the
// browser, each asset valued at the live market price (the testnet's own prices drift).
import { signed, market, STABLE } from "@/lib/testnet";

export async function GET() {
  try {
    const account = await signed<{ balances: { asset: string; free: string; locked: string }[] }>("/account", { omitZeroBalances: "true" });
    const [prices, day] = await Promise.all([
      market<{ symbol: string; price: string }[]>("/ticker/price"),
      market<{ symbol: string; openPrice: string; lastPrice: string }[]>("/ticker/24hr?type=MINI"),
    ]);
    const price = new Map(prices.map((p) => [p.symbol, +p.price]));
    // 24h change from the day's open and last price (the MINI feed carries no percent)
    const change = new Map(day.map((p) => [p.symbol, +p.openPrice ? ((+p.lastPrice - +p.openPrice) / +p.openPrice) * 100 : 0]));
    const balances = account.balances
      .map((b) => {
        const qty = +b.free + +b.locked;
        const p = STABLE.has(b.asset) ? 1 : price.get(`${b.asset}USDT`) ?? 0;
        return { asset: b.asset, free: +b.free, locked: +b.locked, usd: qty * p, price: p, change24h: STABLE.has(b.asset) ? 0 : change.get(`${b.asset}USDT`) ?? 0 };
      })
      .filter((b) => b.usd >= 1)
      .sort((a, b) => b.usd - a.usd);
    return Response.json({ balances });
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: /keys/.test(msg) ? "Add your Binance Spot Testnet keys to .env.local to see balances." : msg }, { status: /keys/.test(msg) ? 400 : 502 });
  }
}
