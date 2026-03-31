import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromCookie } from '@/lib/auth';
import YahooFinance from 'yahoo-finance2';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const ticker = String(body?.ticker ?? '').trim().toUpperCase();
    const quantity = Number(body?.quantity);

    if (!ticker || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid ticker or quantity' },
        { status: 400 }
      );
    }

    // Get current quote from Yahoo Finance and convert to USD when needed.
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const quotes = await yf.quote(ticker);
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;
    const rawPrice = quote?.regularMarketPrice;
    const currency = quote?.currency || 'USD';

    if (typeof rawPrice !== 'number') {
      return NextResponse.json(
        { error: 'Unable to fetch current price' },
        { status: 502 }
      );
    }

    let priceInUSD = rawPrice;
    let exchangeRateToUSD = 1;
    if (currency !== 'USD') {
      let fxBaseCurrency = currency;
      let priceInBaseCurrency = rawPrice;

      if (currency === 'GBp') {
        fxBaseCurrency = 'GBP';
        priceInBaseCurrency = rawPrice / 100;
      }

      // Prefer direct pair (e.g. GBPUSD=X => USD per GBP).
      let fxQuotes = await yf.quote(`${fxBaseCurrency}USD=X`);
      let fxQuote = Array.isArray(fxQuotes) ? fxQuotes[0] : fxQuotes;
      let fxRate = fxQuote?.regularMarketPrice;

      // Fallback to inverse quote (e.g. GBP=X => often USD/GBP) and invert it.
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

      exchangeRateToUSD = fxRate;
      priceInUSD = priceInBaseCurrency * fxRate;
    }

    const totalProceeds = priceInUSD * quantity;

    await sql.query('BEGIN');

    try {
      const holdingResult = await sql`
        SELECT quantity
        FROM holdings
        WHERE user_id = ${session.sub} AND ticker = ${ticker}
      `;

      const holding = holdingResult.rows[0];
      const ownedQuantity = holding ? parseFloat(String(holding.quantity)) : 0;

      if (ownedQuantity < quantity) {
        await sql.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Insufficient shares to sell' },
          { status: 400 }
        );
      }

      await sql`
        UPDATE users
        SET cash_balance = cash_balance + ${totalProceeds}
        WHERE id = ${session.sub}
      `;

      await sql`
        UPDATE holdings
        SET quantity = quantity - ${quantity}
        WHERE user_id = ${session.sub} AND ticker = ${ticker}
      `;

      await sql`
        DELETE FROM holdings
        WHERE user_id = ${session.sub} AND ticker = ${ticker} AND quantity <= 0
      `;

      const userResult = await sql`
        SELECT cash_balance
        FROM users
        WHERE id = ${session.sub}
      `;

      const newCashBalance = parseFloat(String(userResult.rows[0]?.cash_balance ?? 0));

      await sql.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Sold ${quantity} shares of ${ticker}`,
        priceInUSD,
        exchangeRateToUSD,
        quoteCurrency: currency,
        totalProceeds,
        newCashBalance,
        remainingQuantity: Math.max(ownedQuantity - quantity, 0),
      });
    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Sell error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to sell shares' },
      { status: 500 }
    );
  }
}