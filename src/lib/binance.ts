// Binance public market data (no key, CORS open). Orders and balances go to the
// Spot Testnet through our own API route, so keys never reach the browser.
const BASE = "https://data-api.binance.vision/api/v3";

export const NAMES: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", BNB: "BNB", XRP: "XRP", DOGE: "Dogecoin", ADA: "Cardano", AVAX: "Avalanche", LINK: "Chainlink", DOT: "Polkadot", TRX: "Tron", LTC: "Litecoin", USDT: "Tether", USDC: "USD Coin" };

export const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT", "TRXUSDT", "LTCUSDT"];

export type Ticker = { symbol: string; lastPrice: number; priceChangePercent: number; quoteVolume: number; highPrice: number; lowPrice: number };
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type Level = { price: number; qty: number };
export type Trade = { id: number; price: number; qty: number; time: number; isBuyerMaker: boolean };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  return res.json();
}

export async function getTickers(symbols = SYMBOLS): Promise<Ticker[]> {
  const raw = await get<Record<string, string>[]>(`/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
  return raw.map((t) => ({
    symbol: t.symbol,
    lastPrice: +t.lastPrice,
    priceChangePercent: +t.priceChangePercent,
    quoteVolume: +t.quoteVolume,
    highPrice: +t.highPrice,
    lowPrice: +t.lowPrice,
  }));
}

export async function getCandles(symbol: string, interval = "1h", limit = 200): Promise<Candle[]> {
  const raw = await get<(string | number)[][]>(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return raw.map((k) => ({ time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
}

export async function getDepth(symbol: string, limit = 10): Promise<{ bids: Level[]; asks: Level[] }> {
  const raw = await get<{ bids: string[][]; asks: string[][] }>(`/depth?symbol=${symbol}&limit=${limit}`);
  const map = (l: string[][]) => l.map(([p, q]) => ({ price: +p, qty: +q }));
  return { bids: map(raw.bids), asks: map(raw.asks) };
}

export async function getTrades(symbol: string, limit = 20): Promise<Trade[]> {
  const raw = await get<{ id: number; price: string; qty: string; time: number; isBuyerMaker: boolean }[]>(`/trades?symbol=${symbol}&limit=${limit}`);
  return raw.map((t) => ({ id: t.id, price: +t.price, qty: +t.qty, time: t.time, isBuyerMaker: t.isBuyerMaker })).reverse();
}

export const base = (symbol: string) => symbol.replace(/USDT$/, "");
