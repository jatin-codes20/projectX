import { NextResponse } from 'next/server';
import { initializeScheduler } from '@/lib/scheduler';

// Initialize scheduler on module load
initializeScheduler();

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Scheduler initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to initialize scheduler' },
      { status: 500 }
    );
  }
}
