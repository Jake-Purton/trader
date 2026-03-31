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
        <div className="min-h-screen flex items-center justify-center bg-black">
            <h1 className="text-2xl font-bold mb-4 text-center text-green-500">
                Dashboard - Welcome {ticker}
            </h1>
            <p>Balance: {formattedBalance}</p>

            <Search setTicker={setTicker} />
        </div>
    );
}
