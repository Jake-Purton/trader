'use client';

import { useEffect, useState } from 'react';

interface GraphProps {
  ticker: string;
}

export default function Buy({ticker} : GraphProps) {
  
  const [quantity, setQuantity] = useState(1);
  const [ownedQuantity, setOwnedQuantity] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [nativePrice, setNativePrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      try {
        const priceRes = await fetch(`/api/price?ticker=${ticker}`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setCurrentPrice(typeof priceData?.price === 'number' ? priceData.price : Number(priceData?.price) || 0);
          setNativePrice(typeof priceData?.nativePrice === 'number' ? priceData.nativePrice : Number(priceData?.nativePrice) || 0);
          setCurrency(typeof priceData?.currency === 'string' ? priceData.currency : 'USD');
        } else {
          setCurrentPrice(null);
          setNativePrice(null);
          setCurrency('USD');
        }
        
        // Fetch user's cash balance
        const balanceRes = await fetch('/api/user/balance');
        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setCashBalance(data.cashBalance);
          const holdings = Array.isArray(data.holdings) ? data.holdings : [];
          const activeHolding = holdings.find((holding: { ticker: string; quantity: number }) => {
            return String(holding?.ticker ?? '').toUpperCase() === ticker.toUpperCase();
          });
          const parsedOwned = Number(activeHolding?.quantity ?? 0);
          setOwnedQuantity(Number.isFinite(parsedOwned) ? parsedOwned : 0);
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  const totalCost = currentPrice ? currentPrice * quantity : 0;
  const totalProceeds = currentPrice ? currentPrice * quantity : 0;
  const canAfford = cashBalance ? totalCost <= cashBalance : false;
  const canSell = quantity > 0 && ownedQuantity >= quantity;

  const handleBuy = async () => {
    if (!canAfford) {
      setError('Insufficient funds');
      return;
    }

    setPurchasing(true);
    setError('');

    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, quantity })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Purchase failed');
        return;
      }

      setSuccess(`Successfully purchased ${quantity} shares of ${ticker}!`);
      setCashBalance(data.newCashBalance);
      setOwnedQuantity((prev) => prev + quantity);
    } catch (err) {
      setError('Purchase failed');
      console.error(err);
    } finally {
      setPurchasing(false);
    }
  };

  const handleSell = async () => {
    if (!canSell) {
      setError('Insufficient shares to sell');
      return;
    }

    setPurchasing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, quantity })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Sell failed');
        return;
      }

      setSuccess(`Successfully sold ${quantity} shares of ${ticker}!`);
      setCashBalance(data.newCashBalance);
      setOwnedQuantity(typeof data.remainingQuantity === 'number' ? data.remainingQuantity : Math.max(ownedQuantity - quantity, 0));
    } catch (err) {
      setError('Sell failed');
      console.error(err);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <p className="text-green-500">Loading...</p>
    );
  }

  return (
      <div className="">
        <h1 className="text-center mb-6 text-green-500 text-3xl font-bold">
          Buy {ticker}
        </h1>

        {/* Price and Balance */}
        <div className="bg-gray-800 p-4 rounded-xl border border-green-500 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Current Price:</span>
            <div className="text-right">
              <div className="text-green-500 font-semibold">
                ${currentPrice?.toFixed(2) || 'N/A'} USD
              </div>
              {currency !== 'USD' && nativePrice && (
                <div className="text-sm text-gray-400">
                  {currency === 'GBp' 
                    ? `${nativePrice.toFixed(2)}p (£${(nativePrice / 100).toFixed(2)})`
                    : `${nativePrice.toFixed(2)} ${currency}`
                  }
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Your Cash:</span>
            <span className={cashBalance ? (cashBalance > 0 ? 'text-green-500' : 'text-red-500') : ''} >
              ${cashBalance?.toFixed(2) || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">You Own:</span>
            <span className="text-white">{ownedQuantity.toFixed(6)} shares</span>
          </div>
          <div className="border-t border-gray-700 pt-3 flex justify-between">
            <span className="text-gray-400">Total Cost (USD):</span>
            <span className="text-green-500 font-semibold">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Quantity:</label>
          <input
            type="number"
            min= "0.000001"
            step="0.000001"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full p-3 rounded-xl border border-green-500 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-900 border border-red-500 p-3 rounded-xl mb-4 text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 border border-green-500 p-3 rounded-xl mb-4 text-green-200">
            {success}
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={purchasing || !canAfford}
          className={`w-full p-3 rounded-xl font-semibold transition ${
            canAfford && !purchasing
              ? 'bg-green-500 text-black hover:bg-green-600 cursor-pointer'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {purchasing ? 'Processing...' : `Buy ${quantity > 0 ? quantity : 0} Shares`}
        </button>

        <button
          onClick={handleSell}
          disabled={purchasing || !canSell}
          className={`mt-3 w-full p-3 rounded-xl font-semibold transition ${
            canSell && !purchasing
              ? 'bg-red-500 text-black hover:bg-red-600 cursor-pointer'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {purchasing ? 'Processing...' : `Sell ${quantity > 0 ? quantity : 0} Shares`}
        </button>

        {quantity > 0 && (
          <p className="mt-3 text-right text-sm text-gray-400">
            Sell Proceeds (USD): ${totalProceeds.toFixed(2)}
          </p>
        )}
      </div>
  );
}
