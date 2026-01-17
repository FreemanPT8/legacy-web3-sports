import { NextRequest, NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Comments are disabled.' },
    { status: 410 },
  );
}
