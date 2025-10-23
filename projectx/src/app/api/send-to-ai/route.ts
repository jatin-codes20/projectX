import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { topic, tone } = await request.json();

    if (!topic || !tone) {
      return NextResponse.json(
        { error: 'Topic and tone are required' },
        { status: 400 }
      );
    }

    // Call Python AI service
    console.log('Calling Python service with:', { topic, tone });
    const pythonResponse = await fetch('http://127.0.0.1:8000/generate-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic,
        tone: tone
      })
    });
    
    console.log('Python service response status:', pythonResponse.status);

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python service error:', errorText);
      return NextResponse.json(
        { error: 'AI service is not available. Please check if the Python service is running.' },
        { status: 503 }
      );
    }

    const aiData = await pythonResponse.json();
    console.log('Python service response:', aiData);
    
    // Handle the response format from Python service
    const post = aiData.post || aiData.message || 'No content generated';
    return NextResponse.json({ post });
        } catch (error: unknown) {
    console.error('Error in send-to-ai API:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return NextResponse.json(
      { error: `Internal server error: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}