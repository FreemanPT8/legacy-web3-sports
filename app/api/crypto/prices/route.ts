import { NextResponse } from 'next/server';
import { getCryptoPrices } from '@/lib/crypto-prices';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokensParam = searchParams.get('tokens');

    const tokenIds = tokensParam
      ? tokensParam.split(',')
      : ['bitcoin', 'ethereum'];

    const prices = await getCryptoPrices(tokenIds);

    return NextResponse.json({
      success: true,
      prices,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
