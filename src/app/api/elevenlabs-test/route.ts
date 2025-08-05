import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function GET(_request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured',
        status: 'missing_key'
      }, { status: 500 });
    }

    // Test the API key by fetching voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: `ElevenLabs API test failed: ${response.status}`,
        details: errorData,
        status: 'api_error'
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true,
      voiceCount: data.voices?.length || 0,
      status: 'working'
    });

  } catch (error) {
    console.error('ElevenLabs test error:', error);
    return NextResponse.json({ 
      error: 'Failed to test ElevenLabs API',
      status: 'error'
    }, { status: 500 });
  }
} 