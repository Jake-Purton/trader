import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'ALL';

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  try {
    const yf = new YahooFinance(); 
    const results = await yf.search(query)

    let quotes = (results.quotes || []) as any[];
    
    if (type !== 'ALL') {
      quotes = quotes.filter((q: any) => q.quoteType === type);
    }
    
    const filtered = quotes.map((q: any) => ({
      symbol: q.symbol,
      shortname: q.shortname,
      exchange: q.exchange,
      quoteType: q.quoteType,
    }));

    return NextResponse.json({ quotes: filtered });
  } catch (error: any) {
    console.error('Yahoo Finance search error:', error);

    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
