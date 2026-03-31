import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT cash_balance FROM users WHERE id = ${session.sub}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const cashBalance = parseFloat(result.rows[0].cash_balance as string);

    return NextResponse.json({ cashBalance });
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
