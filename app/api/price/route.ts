import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing ticker parameter' },
      { status: 400 }
    );
  }

  try {
    const yf = new YahooFinance();
    const quotes = await yf.quote(ticker);
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;
    const rawPrice = quote?.regularMarketPrice;
    const currency = quote?.currency || 'USD';

    if (typeof rawPrice !== 'number') {
      return NextResponse.json(
        { error: `No quote data found for ticker: ${ticker}` },
        { status: 404 }
      );
    }

    let priceInUSD = rawPrice;
    let exchangeRate = 1;

    // Keep conversion aligned with buy/sell flows, including GBp handling.
    if (currency !== 'USD') {
      let fxBaseCurrency = currency;
      let priceInBaseCurrency = rawPrice;

      if (currency === 'GBp') {
        fxBaseCurrency = 'GBP';
        priceInBaseCurrency = rawPrice / 100;
      }

      let fxQuotes = await yf.quote(`${fxBaseCurrency}USD=X`);
      let fxQuote = Array.isArray(fxQuotes) ? fxQuotes[0] : fxQuotes;
      let fxRate = fxQuote?.regularMarketPrice;

      if (typeof fxRate !== 'number') {
        fxQuotes = await yf.quote(`${fxBaseCurrency}=X`);
        fxQuote = Array.isArray(fxQuotes) ? fxQuotes[0] : fxQuotes;
        const inverseFxRate = fxQuote?.regularMarketPrice;

        if (typeof inverseFxRate === 'number' && inverseFxRate > 0) {
          fxRate = 1 / inverseFxRate;
        }
      }

      if (typeof fxRate !== 'number' || !Number.isFinite(fxRate) || fxRate <= 0) {
        return NextResponse.json(
          { error: `Unable to fetch exchange rate for ${currency}` },
          { status: 502 }
        );
      }

      exchangeRate = fxRate;
      priceInUSD = priceInBaseCurrency * fxRate;
    }

    return NextResponse.json({
      ticker,
      price: priceInUSD,
      nativePrice: rawPrice,
      currency,
      exchangeRate
    });

  } catch (error: any) {
    console.error('Yahoo Finance API ERROR:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}