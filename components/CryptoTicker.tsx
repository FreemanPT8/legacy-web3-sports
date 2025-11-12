'use client';

import { useEffect, useState, memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export const CryptoTicker = memo(function CryptoTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices?tokens=bitcoin,ethereum');
        const data = await response.json();
        if (data.success) {
          setPrices(data.prices);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || prices.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 text-white py-2 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-8 text-sm">
          {prices.map((token) => (
            <div key={token.id} className="flex items-center gap-3">
              <span className="font-semibold uppercase">{token.symbol}</span>
              <span className="font-mono">
                ${token.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-1 ${
                token.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {token.price_change_percentage_24h >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(token.price_change_percentage_24h).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
