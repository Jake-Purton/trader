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
    const yf = new YahooFinance(); 
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

    // Convert to USD if necessary
    let priceInUSD = currentPrice;
    if (currency !== 'USD') {
      // Handle fractional currencies (e.g., GBp = pence, needs to be converted to GBP)
      let exchangeCurrency = currency;
      let priceInBaseCurrency = currentPrice;

      if (currency === 'GBp') {
        // Convert pence to pounds (divide by 100)
        priceInBaseCurrency = currentPrice / 100;
        exchangeCurrency = 'GBP';
      }

      // Get exchange rate
      const exchangeTicker = `${exchangeCurrency}=X`; // e.g., GBP=X for GBP to USD
      try {
        const exchangeQuotes = await yf.quote(exchangeTicker);
        const exchangeQuote = Array.isArray(exchangeQuotes) ? exchangeQuotes[0] : exchangeQuotes;
        const exchangeRate = exchangeQuote?.regularMarketPrice;
        if (exchangeRate) {
          priceInUSD = priceInBaseCurrency * exchangeRate;
        } else {
          return NextResponse.json(
            { error: `Unable to fetch exchange rate for ${currency}` },
            { status: 500 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: `Unable to fetch exchange rate for ${currency}` },
          { status: 500 }
        );
      }
    }

    const totalCost = priceInUSD * quantity;

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
