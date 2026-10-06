// Server only: signed calls to the Binance Spot Testnet. Keys from .env.local.
import { createHmac } from "node:crypto";

const TESTNET = "https://testnet.binance.vision/api/v3";
const PUBLIC = "https://data-api.binance.vision/api/v3";
export const STABLE = new Set(["USDT", "USDC", "FDUSD", "BUSD", "TUSD"]);

const keys = () => {
  const key = process.env.BINANCE_TESTNET_KEY;
  const secret = process.env.BINANCE_TESTNET_SECRET;
  return key && secret ? { key, secret } : null;
};
export const hasKeys = () => keys() !== null;

/** a signed request; throws with Binance's own message when it refuses */
export async function signed<T>(path: string, params: Record<string, string | number> = {}, method: "GET" | "POST" = "GET"): Promise<T> {
  const k = keys();
  if (!k) throw new Error("No testnet keys in .env.local");
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([a, b]) => [a, String(b)])), timestamp: String(Date.now()) }).toString();
  const signature = createHmac("sha256", k.secret).update(query).digest("hex");
  const res = await fetch(`${TESTNET}${path}?${query}&signature=${signature}`, { method, headers: { "X-MBX-APIKEY": k.key }, cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg ?? `Binance testnet answered ${res.status}`);
  return body as T;
}

/** public market data, the real market (the testnet's own prices drift) */
// the full price lists are a few MB: kept for 30 s, so every page load does not fetch them again
const kept = new Map<string, { at: number; body: Promise<unknown> }>();
export async function market<T>(path: string): Promise<T> {
  const hit = kept.get(path);
  if (hit && Date.now() - hit.at < 30_000) return hit.body as Promise<T>;
  const body = fetch(`${PUBLIC}${path}`, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    return res.json();
  });
  kept.set(path, { at: Date.now(), body });
  body.catch(() => kept.delete(path));
  return body as Promise<T>;
}

export type Fill = { orderId: number; status: string; executedQty: string; cummulativeQuoteQty: string };
