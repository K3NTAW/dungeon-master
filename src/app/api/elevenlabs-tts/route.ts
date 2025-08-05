/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'VR6AewLTigWG4xSOukaG'; // Default to Arnold (deep, dramatic)

/**
 * Enhance emotional delivery for D&D narration
 */
function enhanceEmotionalDelivery(text: string): string {
  // Add dramatic pauses and emphasis for key moments
  let enhanced = text;
  
  // Add dramatic pauses for suspense
  enhanced = enhanced.replace(/([.!?])\s+/g, '$1... ');
  
  // Add emphasis for dramatic moments
  enhanced = enhanced.replace(/\b(CRITICAL|DEADLY|DANGEROUS|MYSTERIOUS|ANCIENT|POWERFUL)\b/gi, '<break time="500ms"/>$1<break time="300ms"/>');
  
  // Add pauses for character names and important items
  enhanced = enhanced.replace(/\b(sword|shield|magic|spell|dragon|monster|treasure|gold|silver|platinum)\b/gi, '<break time="200ms"/>$1');
  
  // Add dramatic pauses for combat
  enhanced = enhanced.replace(/\b(attack|defend|dodge|parry|strike|slash|thrust)\b/gi, '<break time="150ms"/>$1');
  
  // Add emphasis for numbers and damage
  enhanced = enhanced.replace(/(\d+)\s*(damage|points|feet|miles)/gi, '<break time="100ms"/>$1 $2');
  
  // Add dramatic pauses for environmental descriptions
  enhanced = enhanced.replace(/\b(dark|shadow|light|bright|cold|hot|wet|dry|rough|smooth)\b/gi, '<break time="100ms"/>$1');
  
  return enhanced;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId = ELEVENLABS_VOICE_ID, voiceSettings } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file.' 
      }, { status: 500 });
    }

    // Clean the text for TTS (remove dice roll placeholders and other formatting)
    let cleanText = text
      .replace(/\[DICE:[^\]]+\]/g, '') // Remove dice roll placeholders
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\*/g, '') // Remove markdown italic
      .replace(/`/g, '') // Remove code blocks
      .trim();

    // Enhance emotional delivery for D&D narration
    cleanText = enhanceEmotionalDelivery(cleanText);

    if (!cleanText) {
      return NextResponse.json({ error: 'No text content after cleaning' }, { status: 400 });
    }

    console.log('Sending to ElevenLabs:', { voiceId, textLength: cleanText.length });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: voiceSettings || {
            stability: 0.3, // Lower stability for more emotion
            similarity_boost: 0.85, // Higher similarity for consistent character
            style: 0.8, // Higher style for more dramatic delivery
            use_speaker_boost: true
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs API error:', errorData);
      console.error('Response status:', response.status);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} - ${errorData.detail || errorData.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 