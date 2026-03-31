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

  async function fetchData(selectedRange: string) {
    const res = await fetch(`/api/stocks?range=${selectedRange}`);
    const json = await res.json();

    // Transform API data → chart format
    const formatted = json.results?.map((item: any) => ({
      time: new Date(item.t).toLocaleDateString(),
      price: item.c
    })) || [];

    setData(formatted);
  }

  useEffect(() => {
    fetchData(range);
  }, [range]);

  return (
    <main style={{ padding: 20 }}>
      <h1>AAPL Chart</h1>

      {/* Range buttons */}
      <div style={{ marginBottom: 20 }}>
        {['1D', '1W', '1M', '1Y'].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              marginRight: 10,
              padding: '8px 12px',
              background: r === range ? '#333' : '#eee',
              color: r === range ? '#fff' : '#000',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="price" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </main>
  );
}