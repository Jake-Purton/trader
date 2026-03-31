import { NextRequest, NextResponse } from 'next/server';
import { GetStocksAggregatesSortEnum, GetStocksAggregatesTimespanEnum, restClient } from '@massive.com/client-js';

const apiKey = process.env.MASSIVE_API_KEY!;
const rest = restClient(apiKey, 'https://api.massive.com');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing ticker parameter' },
      { status: 400 }
    );
  }

  try {
    // Get latest 1-minute aggregate (most recent price)
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 1);

    const response = await rest.getStocksAggregates({
      stocksTicker: ticker.toUpperCase(),
      multiplier: 1,
      timespan: GetStocksAggregatesTimespanEnum.Minute,
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
      adjusted: true,
      sort: GetStocksAggregatesSortEnum.Desc,
      limit: 1
    });

    const latest = response.results?.[0];

    return NextResponse.json({
      ticker,
      price: latest?.c ?? null,
      timestamp: latest?.t ?? null
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}