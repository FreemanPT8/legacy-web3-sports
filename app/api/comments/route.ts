import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Comments are disabled.',
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Comments are disabled.' },
    { status: 410 },
  );
}
