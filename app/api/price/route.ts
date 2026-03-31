import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { quote } from 'yahoo-finance2/modules';

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
    // Get current quote for the ticker
    const yf = new YahooFinance(); 
    const quote = await yf.quote(ticker.toUpperCase())

    return NextResponse.json({
      price: quote.regularMarketPrice ?? null
    });

  } catch (error: any) {
    console.error('Yahoo Finance API ERROR:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}