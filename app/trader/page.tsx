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

      // Transform API data → chart format
      const formatted = json.results?.map((item: any) => ({
        time: new Date(item.t).toISOString().split('T')[0],
        price: item.c
      })) || [];

      setData(formatted);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setData([]);
    }
  }

  async function getCurrentPrice() {
    try {
      const res = await fetch(`/api/stocks?ticker=AAPL`);
      if (!res.ok) {
        console.log('Failed to fetch price');
        return;
      } 
      
      const data = await res.json();
      const currentPrice = data.results?.at(-1)?.c ?? null;
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
    <main
      style={{
        maxWidth: 1400,
        margin: '40px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#000',
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: 10, color: '#22c55e' }}>AAPL Chart</h1>

      {mounted && (
        <>
          {/* Current price */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 32,
              fontWeight: 'bold',
              marginBottom: 20,
              color: '#22c55e',
            }}
          >
            ${currentPrice ?? 'N/A'}
          </div>

          {/* Range buttons */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            {['1D', '1W', '1M', '1Y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  margin: '0 8px',
                  padding: '8px 16px',
                  background: r === range ? '#22c55e' : '#1f2937',
                  color: r === range ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (r !== range) (e.currentTarget.style.background = '#374151');
                }}
                onMouseLeave={(e) => {
                  if (r !== range) (e.currentTarget.style.background = '#1f2937');
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Chart container */}
          <div
            style={{
              padding: 20,
              background: '#1f2937',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
            }}
          >
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