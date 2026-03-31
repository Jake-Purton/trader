import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing from or to currency parameter' },
        { status: 400 }
      );
    }

    // Handle fractional currencies (e.g., GBp = pence)
    let baseCurrencyFrom = from;
    if (from === 'GBp') {
      baseCurrencyFrom = 'GBP';
    }

    // Create the currency pair ticker (e.g., GBP=X for GBP to USD)
    const currencyPair = `${baseCurrencyFrom}${to}=X`;

    const yf = new YahooFinance();
    const quotes = await yf.quote(currencyPair);
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;

    const rate = quote?.regularMarketPrice;

    if (!rate) {
      return NextResponse.json(
        { error: `Unable to fetch exchange rate for ${from}/${to}` },
        { status: 500 }
      );
    }

    // If the source currency is in pence, adjust the rate
    let adjustedRate = rate;
    if (from === 'GBp') {
      // GBp to USD rate = GBP to USD rate / 100
      adjustedRate = rate / 100;
    }

    return NextResponse.json({
      from,
      to,
      rate: adjustedRate,
      inverse: 1 / adjustedRate
    });
  } catch (error: any) {
    console.error('Exchange rate fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
