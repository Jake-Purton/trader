import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

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
  let interval: "1d" | "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "5d" | "1wk" | "1mo" | "3mo" = "1d";

  switch (range) {
    case '1D':
      from.setDate(now.getDate() - 1);
      interval = '30m';
      break;
    case '1W':
      from.setDate(now.getDate() - 7);
      interval = '90m';
      break;
    case '1M':
      from.setMonth(now.getMonth() - 1);
      interval = '1d';
      break;
    case '1Y':
      from.setFullYear(now.getFullYear() - 1);
      interval = '1wk';
      break;
  }

  try {
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const response = await yf.chart(ticker.toUpperCase(), {
      period1: from,
      period2: now,
      interval: interval
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Yahoo Finance API ERROR:', error);

    return NextResponse.json(
      { error: error?.message || 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}