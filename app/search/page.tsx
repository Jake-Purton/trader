"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Quote = {
  symbol: string;
  shortname: string;
  exchange: string;
  quoteType: "EQUITY" | "ETF" | "CRYPTOCURRENCY";
};

export default function Search() {
  const router = useRouter();
  const [type, setType] = useState<"ETF" | "CRYPTOCURRENCY" | "EQUITY" | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔁 Debounced search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${type}`
        );
        const data = await res.json();

        const filtered: Quote[] = data.quotes || [];

        setResults(filtered);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, type]);

  return (
    <div className="w-full px-5 bg-black min-h-screen text-white py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-center mb-6 text-green-500 text-3xl font-bold">Search</h1>

        {/* 🔍 Search input */}
        <input
          type="text"
          placeholder="Search stocks, ETFs, crypto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 rounded-xl border border-green-500 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* 🎛️ Filter buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {["ALL", "EQUITY", "ETF", "CRYPTOCURRENCY"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                type === t
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 📊 Results */}
        <div className="mt-6 space-y-2">
          {loading && <p className="text-green-500">Searching...</p>}

          {!loading && results.length === 0 && query && (
            <p className="text-gray-400">No results</p>
          )}

          {!loading && results.length > 0 && results.map((r) => (
            <div
              key={r.symbol}
              onClick={() => router.push(`/buy/${r.symbol}`)}
              className="p-3 rounded-xl border border-green-500 hover:bg-gray-900 cursor-pointer transition bg-gray-800"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-500">{r.symbol}</span>
                <span className="text-xs text-gray-400">{r.exchange}</span>
              </div>
              <p className="text-sm text-gray-300">{r.shortname}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}