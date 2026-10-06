// The data is ready (src/lib and src/app/api). The screens are yours to build: paste the prompt.
export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-10 text-sm leading-6">
      <h1 className="text-lg font-semibold">Trading dashboard starter</h1>
      <p>Live Binance market data in src/lib/binance.ts, EMA crossover signals in src/lib/signals.ts, and a Binance Spot Testnet account behind /api/account, /api/trades, /api/history and /api/order.</p>
    </main>
  );
}
