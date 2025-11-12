export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

const CACHE_DURATION = 5 * 60 * 1000;
let priceCache: { data: TokenPrice[]; timestamp: number } | null = null;

export async function getCryptoPrices(tokenIds: string[] = ['bitcoin', 'ethereum']): Promise<TokenPrice[]> {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.data.filter(token => tokenIds.includes(token.id));
  }

  try {
    const idsParam = tokenIds.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=false`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return getMockPrices(tokenIds);
    }

    const data = await response.json();

    priceCache = {
      data,
      timestamp: Date.now()
    };

    return data;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    return getMockPrices(tokenIds);
  }
}

function getMockPrices(tokenIds: string[]): TokenPrice[] {
  const mockData: Record<string, TokenPrice> = {
    'bitcoin': {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 43250.50,
      price_change_24h: 1205.30,
      price_change_percentage_24h: 2.87,
      market_cap: 846000000000,
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
    },
    'ethereum': {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      current_price: 2285.75,
      price_change_24h: -45.20,
      price_change_percentage_24h: -1.94,
      market_cap: 274000000000,
      image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
    }
  };

  return tokenIds.map(id => mockData[id]).filter(Boolean);
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
}

export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
