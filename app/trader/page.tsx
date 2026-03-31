'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [range, setRange] = useState('1M');
  const [currentPrice, setPrice] = useState(0.0);
  const [mounted, setMounted] = useState(false);

  async function fetchData(selectedRange: string) {
    try {
      const res = await fetch(`/api/stocks?range=${selectedRange}&ticker=${"AAPL"}`);
      if (!res.ok) {
        console.log('Failed to fetch chart data');
        return
      }
      
      const json = await res.json();

      console.log('Yahoo Finance response:', json);

      const quotes = json.result || json.quotes || [];
      const formatted = quotes.map((item: any) => {
        // Yahoo Finance returns date as Unix timestamp (seconds)
        const timestamp = typeof item.date === 'number' ? item.date * 1000 : item.date;
        const dateStr = new Date(timestamp).toISOString().split('T')[0];
        return {
          time: dateStr,
          price: item.close
        };
      }) || [];

      setData(formatted);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setData([]);
    }
  }

  async function getCurrentPrice() {
    try {
      const res = await fetch(`/api/price?ticker=AAPL`);
      if (!res.ok) {
        console.log('Failed to fetch price');
        return;
      } 
      
      const data = await res.json();
      const currentPrice = data.price ?? null;
      setPrice(currentPrice);
    } catch (error) {
      console.error('Error fetching current price:', error);
      setPrice(0);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData(range);
      getCurrentPrice();
    }
  }, [range, mounted]);

  return (
    <main className="w-full px-5 bg-black min-h-screen text-white">
      <h1 className="text-center mb-2.5 text-green-500 text-3xl font-bold">AAPL Chart</h1>

      {mounted && (
        <>
          {/* Current price */}
          <div className="text-center text-4xl font-bold mb-5 text-green-500">
            ${currentPrice ?? 'N/A'}
          </div>

          {/* Range buttons */}
          <div className="text-center mb-7.5">
            {['1D', '1W', '1M', '1Y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`mx-2 px-4 py-2 rounded-full cursor-pointer font-medium transition-colors ${
                  r === range
                    ? 'bg-green-500 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Chart container */}
          <div className="p-5 bg-gray-800 rounded-lg shadow-lg border border-green-500">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <XAxis dataKey="time" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#22c55e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </main>
  );
}