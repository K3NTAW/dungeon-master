/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { ReplicateManager } from '@/lib/replicate';

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!REPLICATE_API_KEY) {
      return NextResponse.json(
        { error: 'Replicate API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Replicate
    ReplicateManager.init(REPLICATE_API_KEY);

    const { itemName, itemType, options } = await request.json();

    if (!itemName) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    console.log(`Generating image for: ${itemName} (${itemType || 'item'})`);

    const image = await ReplicateManager.generateItemImage(
      itemName,
      itemType || 'item',
      options || {}
    );

    if (!image) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: image
    });

  } catch (error) {
    console.error('Error generating item image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!REPLICATE_API_KEY) {
      return NextResponse.json(
        { error: 'Replicate API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Replicate
    ReplicateManager.init(REPLICATE_API_KEY);

    const models = ReplicateManager.getAvailableModels();

    return NextResponse.json({
      success: true,
      available: ReplicateManager.isAvailable(),
      models: models
    });

  } catch (error) {
    console.error('Error checking Replicate status:', error);
    return NextResponse.json(
      { error: 'Failed to check Replicate status' },
      { status: 500 }
    );
  }
} 