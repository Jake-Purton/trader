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

    const { ticker, quantity } = await req.json();

    if (!ticker || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid ticker or quantity' },
        { status: 400 }
      );
    }

    // Get current price from Yahoo Finance
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] }); 
    const quotes = await yf.quote(ticker.toUpperCase());
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;

    let currentPrice = quote?.regularMarketPrice;
    const currency = quote?.currency || 'USD';

    if (!currentPrice) {
      return NextResponse.json(
        { error: 'Unable to fetch current price' },
        { status: 500 }
      );
    }

    // Convert to USD if necessary.
    let priceInUSD = currentPrice;
    let exchangeRateToUSD = 1;
    if (currency !== 'USD') {
      let fxBaseCurrency = currency;
      let priceInBaseCurrency = currentPrice;

      if (currency === 'GBp') {
        fxBaseCurrency = 'GBP';
        priceInBaseCurrency = currentPrice / 100;
      }

      let fxQuotes = await yf.quote(`${fxBaseCurrency}USD=X`);
      let fxQuote = Array.isArray(fxQuotes) ? fxQuotes[0] : fxQuotes;
      let fxRate = fxQuote?.regularMarketPrice;

      // Fallback to inverse quote and invert it when the direct pair is unavailable.
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

    const totalCost = priceInUSD * quantity;

    if (totalCost < 0.01) {
      return NextResponse.json(
        { error: `Too cheap` },
        { status: 500 }
      );
    }

    // Use a transaction to ensure consistency
    const result = await sql.query('BEGIN');

    try {
      // Get user's current cash balance
      const userResult = await sql`
        SELECT cash_balance FROM users WHERE id = ${session.sub}
      `;

      const user = userResult.rows[0];
      if (!user) {
        await sql.query('ROLLBACK');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const cashBalance = parseFloat(user.cash_balance as string);

      // Check if user has enough cash
      if (cashBalance < totalCost) {
        await sql.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Insufficient funds' },
          { status: 400 }
        );
      }

      // Update cash balance
      await sql`
        UPDATE users 
        SET cash_balance = cash_balance - ${totalCost}
        WHERE id = ${session.sub}
      `;

      // Update or insert holdings
      await sql`
        INSERT INTO holdings (user_id, ticker, quantity)
        VALUES (${session.sub}, ${ticker.toUpperCase()}, ${quantity})
        ON CONFLICT (user_id, ticker)
        DO UPDATE SET quantity = holdings.quantity + ${quantity}
      `;

      // Commit transaction
      await sql.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Purchased ${quantity} shares of ${ticker}`,
        priceInUSD,
        exchangeRateToUSD,
        quoteCurrency: currency,
        totalCost,
        newCashBalance: cashBalance - totalCost
      });
    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Buy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to purchase' },
      { status: 500 }
    );
  }
}
