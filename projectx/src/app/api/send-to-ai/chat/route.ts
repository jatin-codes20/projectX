import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, previous_posts, use_account_tone, platform } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Call Python AI service chat endpoint
    console.log('Calling Python chat service with:', { 
      messageCount: messages.length,
      previousPostsCount: previous_posts?.length || 0,
      use_account_tone,
      platform 
    });
    
    const pythonResponse = await fetch('http://127.0.0.1:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        previous_posts: previous_posts || [],
        use_account_tone: use_account_tone || false,
        platform: platform || 'twitter'
      })
    });
    
    console.log('Python chat service response status:', pythonResponse.status);

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python chat service error:', errorText);
      return NextResponse.json(
        { error: 'AI service is not available. Please check if the Python service is running.' },
        { status: 503 }
      );
    }

    const aiData = await pythonResponse.json();
    console.log('Python chat service response:', aiData);
    
    // Return the chat response with message and suggested_content
    return NextResponse.json({
      message: aiData.message || '',
      suggested_content: aiData.suggested_content || null
    });
    
  } catch (error: unknown) {
    console.error('Error in send-to-ai chat API:', error);
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

