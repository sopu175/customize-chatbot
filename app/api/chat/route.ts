import { NextRequest, NextResponse } from 'next/server';
import { generateChatbotResponse } from '@/lib/chatbot';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API: Received POST request');
    
    const { message } = await request.json();
    console.log('Chat API: Parsed message:', message);
    
    if (!message || typeof message !== 'string') {
      console.log('Chat API: Invalid message format');
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    console.log('Chat API: Generating response...');
    const response = await generateChatbotResponse(message);
    console.log('Chat API: Generated response length:', response.length);
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}