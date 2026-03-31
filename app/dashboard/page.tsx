"use client";

import Search from "@/components/search";
import { useEffect, useRef, useState } from 'react';

export default function Dashboard() {
    const [ticker, setTicker] = useState<string>("");
    const [balance, setBalance] = useState<number>(0);
    const hasFetchedBalance = useRef(false);

    useEffect(() => {
        // Guard avoids duplicate fetches in React Strict Mode during development.
        if (hasFetchedBalance.current) return;
        hasFetchedBalance.current = true;

        async function getBalance() {
            const balanceRes = await fetch('/api/user/balance');
            const balanceData = await balanceRes.json();
            const rawBalance = balanceData?.cashBalance;
            setBalance(rawBalance ? Number(rawBalance) : 0);
        }

        getBalance().catch((err) => {
            console.error('Failed to fetch balance', err);
        });
    }, []);

    const formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(balance);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-green-500">Dashboard - Welcome {ticker}</h1>
                <p className="mt-2 text-gray-300">Balance: {formattedBalance}</p>
            </header>

            <main className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="min-h-[420px] rounded-xl border border-gray-800 bg-gray-950/50 p-4" />

                <section className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                    <Search setTicker={setTicker} />
                </section>
            </main>
        </div>
    );
}
