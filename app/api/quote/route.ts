import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing ticker parameter' },
        { status: 400 }
      );
    }

    const yf = new YahooFinance();
    const quotes = await yf.quote(ticker.toUpperCase());
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      price: quote?.regularMarketPrice || null,
      currency: quote?.currency || 'USD',
      name: quote?.longName || quote?.shortName || ticker
    });
  } catch (error: any) {
    console.error('Quote fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
