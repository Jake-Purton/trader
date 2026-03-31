"use client";

import Search from "@/components/search";
import Graph from "@/components/graph";
import Buy from "@/components/buy";
import { useEffect, useMemo, useState } from 'react';

type Holding = {
    ticker: string;
    quantity: number;
    averagePriceUsd: number | null;
};

type HoldingWithPrice = Holding & {
    currentPriceUsd: number | null;
};

export default function Dashboard() {
    const [ticker, setTicker] = useState<string>("");
    const [balance, setBalance] = useState<number>(0);
    const [username, setUsername] = useState<string>("");
    const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
    const [portfolioLoading, setPortfolioLoading] = useState<boolean>(true);
    const [portfolioError, setPortfolioError] = useState<string>("");

    useEffect(() => {
        let isMounted = true;

        async function refreshPortfolio() {
            try {
                const balanceRes = await fetch('/api/user/balance');
                if (!balanceRes.ok) {
                    throw new Error('Failed to fetch user balance');
                }

                const balanceData = await balanceRes.json();
                const rawBalance = balanceData?.cashBalance;
                const username = balanceData?.username as string;
                const userHoldings = (balanceData?.holdings ?? []) as Holding[];

                if (!isMounted) {
                    return;
                }

                setUsername(username);
                setBalance(rawBalance ? Number(rawBalance) : 0);

                if (userHoldings.length === 0) {
                    setHoldings([]);
                    setPortfolioError("");
                    return;
                }

                const pricedHoldings = await Promise.all(
                    userHoldings.map(async (holding) => {
                        try {
                            const priceRes = await fetch(`/api/price?ticker=${encodeURIComponent(holding.ticker)}`);
                            if (!priceRes.ok) {
                                return { ...holding, currentPriceUsd: null };
                            }

                            const priceData = await priceRes.json();
                            const currentPriceUsd = typeof priceData?.price === 'number'
                                ? priceData.price
                                : Number(priceData?.price);

                            return {
                                ...holding,
                                currentPriceUsd: Number.isFinite(currentPriceUsd) ? currentPriceUsd : null,
                            };
                        } catch {
                            return { ...holding, currentPriceUsd: null };
                        }
                    })
                );

                if (!isMounted) {
                    return;
                }

                setHoldings(pricedHoldings);
                setPortfolioError("");
            } catch (err) {
                console.error('Failed to fetch balance', err);
                if (isMounted) {
                    setPortfolioError('Unable to load portfolio data right now.');
                }
            } finally {
                if (isMounted) {
                    setPortfolioLoading(false);
                }
            }
        }

        refreshPortfolio();
        const intervalId = setInterval(refreshPortfolio, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const formattedBalance = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(balance);

    const usdFormatter = useMemo(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });
    }, []);

    const positionsTotal = useMemo(() => {
        return holdings.reduce((sum, holding) => {
            if (holding.currentPriceUsd === null) {
                return sum;
            }
            return sum + (holding.currentPriceUsd * holding.quantity);
        }, 0);
    }, [holdings]);

    const accountTotal = positionsTotal + balance;

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-green-500">Dashboard - Welcome {username} </h1>
                <p className="mt-2 text-gray-300">Balance: {formattedBalance}</p>
            </header>

            <main className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="min-h-[420px] rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                    <h2 className="mb-4 text-xl font-semibold text-green-500">Portfolio</h2>

                    {portfolioLoading ? (
                        <p className="text-gray-400">Loading portfolio...</p>
                    ) : portfolioError ? (
                        <p className="text-red-400">{portfolioError}</p>
                    ) : holdings.length === 0 ? (
                        <p className="text-gray-400">No holdings yet. Buy a ticker to start building your portfolio.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-800 text-left text-gray-400">
                                        <th className="px-2 py-2">Name</th>
                                        <th className="px-2 py-2">Volume Owned</th>
                                        <th className="px-2 py-2">Current Price (USD)</th>
                                        <th className="px-2 py-2">Volume * Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.map((holding) => (
                                        <tr key={holding.ticker} className="border-b border-gray-900">
                                            <td className="px-2 py-2 font-medium text-white"><button onClick={() => setTicker(holding.ticker)}>{holding.ticker}</button></td>
                                            <td className="px-2 py-2 text-gray-200">{holding.quantity.toFixed(6)}</td>
                                            <td className="px-2 py-2 text-gray-200">
                                                {holding.currentPriceUsd === null
                                                    ? 'N/A'
                                                    : usdFormatter.format(holding.currentPriceUsd)}
                                            </td>
                                            <td className="px-2 py-2 text-green-300">
                                                {holding.currentPriceUsd === null
                                                    ? 'N/A'
                                                    : usdFormatter.format(holding.currentPriceUsd * holding.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-4 space-y-1 border-t border-gray-800 pt-4 text-sm">
                        <p className="text-gray-300">Cash Owned: <span className="font-semibold text-white">{usdFormatter.format(balance)}</span></p>
                        <p className="text-gray-300">Total Positions: <span className="font-semibold text-white">{usdFormatter.format(positionsTotal)}</span></p>
                        <p className="text-gray-100">Account Total: <span className="font-bold text-green-400">{usdFormatter.format(accountTotal)}</span></p>
                    </div>

                </section>

                <section className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                {ticker ? (
                    <>
                    <button onClick={() => setTicker("")}>Back to search</button>
                    <Graph ticker={ticker} />
                    <Buy ticker={ticker} />
                    </>
                ) : (
                    <Search setTicker={setTicker} />
                )}
                </section>
            </main>
        </div>
    );
}
