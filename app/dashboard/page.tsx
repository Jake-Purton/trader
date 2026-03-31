import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { sql } from '@vercel/postgres';


export default async function Dashboard() {
    const session = await getSessionFromCookie();

    if (!session) {
        redirect('/');
    }
    
    const activeSession = session;

    async function getBalance(): Promise<number> {
        const res = await sql<{ cash_balance: string }>`
            SELECT cash_balance
            FROM users
            WHERE id = ${activeSession.sub}
            LIMIT 1
        `;

        const rawBalance = res.rows[0]?.cash_balance;
        return rawBalance ? Number(rawBalance) : 0;
    }

    const balance = await getBalance();
    const formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(balance);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <h1 className="text-2xl font-bold mb-4 text-center text-green-500">
                Dashboard - Welcome {session.username}
            </h1>
            <p>Balance: {formattedBalance}</p>
        </div>
    );
}
