import { NextResponse } from 'next/server';
import { triggerSchedulerCheck } from '@/lib/scheduler';

export async function POST() {
  try {
    await triggerSchedulerCheck();
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering scheduler check:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scheduler check' },
      { status: 500 }
    );
  }
}
