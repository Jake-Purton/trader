import { NextRequest, NextResponse } from 'next/server';
import { GetStocksAggregatesSortEnum, GetStocksAggregatesTimespanEnum, restClient } from '@massive.com/client-js';

const apiKey = process.env.MASSIVE_API_KEY!;
const rest = restClient(apiKey, 'https://api.massive.com');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const range = searchParams.get('range') || '1M';
  const ticker = searchParams.get('ticker');
  
  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing ticker parameter' },
      { status: 400 }
    );
  }

  const now = new Date();
  let from = new Date();
  let timespan = GetStocksAggregatesTimespanEnum.Minute;

  switch (range) {
    case '1D':
      from.setDate(now.getDate() - 1);
      break;
    case '1W':
      from.setDate(now.getDate() - 7);
      timespan = GetStocksAggregatesTimespanEnum.Hour
      break;
    case '1M':
      from.setMonth(now.getMonth() - 1);
      timespan = GetStocksAggregatesTimespanEnum.Day
      break;
    case '1Y':
      from.setFullYear(now.getFullYear() - 1);
      timespan = GetStocksAggregatesTimespanEnum.Day
      break;
  }

  try {
    const response = await rest.getStocksAggregates({
        stocksTicker: ticker,
        multiplier: 1,
        timespan: timespan,
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
        adjusted: true,
        sort: GetStocksAggregatesSortEnum.Asc,
        limit: 500
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API ERROR:', error);

    return NextResponse.json(
      { error: error?.message || 'Failed to fetch price' },
      { status: 500 }
    );
  }
}