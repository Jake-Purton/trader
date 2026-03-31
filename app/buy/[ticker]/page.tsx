'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function BuyPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = decodeURIComponent((params?.ticker as string) || '').toUpperCase();
  
  const [quantity, setQuantity] = useState(1);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [nativePrice, setNativePrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      try {
        // Fetch quote with currency info
        const quoteRes = await fetch(`/api/quote?ticker=${ticker}`);
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          const price = quoteData.price || 0;
          const curr = quoteData.currency || 'USD';
          
          setNativePrice(price);
          setCurrency(curr);
          
          // If not USD, fetch exchange rate and convert
          if (curr !== 'USD') {
            try {
              const exchangeRes = await fetch(`/api/exchange-rate?from=${curr}&to=USD`);
              if (exchangeRes.ok) {
                const exchangeData = await exchangeRes.json();
                const rate = exchangeData.rate || 1;
                setExchangeRate(rate);
                setCurrentPrice(price * rate);
              } else {
                setCurrentPrice(price);
              }
            } catch (err) {
              setCurrentPrice(price);
              console.error('Failed to fetch exchange rate', err);
            }
          } else {
            setCurrentPrice(price);
          }
        }
        
        // Fetch user's cash balance
        const balanceRes = await fetch('/api/user/balance');
        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setCashBalance(data.cashBalance);
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
  const canAfford = cashBalance ? totalCost <= cashBalance : false;

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

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Purchase failed');
      console.error(err);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-5 bg-black min-h-screen text-white flex items-center justify-center">
        <p className="text-green-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="w-full px-5 bg-black min-h-screen text-white py-8">
      <div className="max-w-md mx-auto">
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
            min="1"
            step="0.000001"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
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

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="w-full mt-3 p-3 rounded-xl font-semibold border border-gray-600 hover:border-green-500 transition text-gray-300 hover:text-green-500"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
