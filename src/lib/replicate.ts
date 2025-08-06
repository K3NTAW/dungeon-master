/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ImageGenerationOptions {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  quality?: number;
  style?: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  metadata?: any;
}

/**
 * Replicate image generation utility for D&D items
 */
export class ReplicateManager {
  private static apiKey: string | undefined;
  private static defaultModel = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

  /**
   * Initialize Replicate with API key
   */
  static init(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if Replicate is available
   */
  static isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate an image for a D&D item
   */
  static async generateItemImage(itemName: string, itemType: string = "item", options: Partial<ImageGenerationOptions> = {}): Promise<GeneratedImage | null> {
    if (!this.isAvailable()) {
      throw new Error("Replicate API key not configured");
    }

    const defaultPrompt = this.createItemPrompt(itemName, itemType);
    const prompt = options.prompt || defaultPrompt;
    const model = options.model || this.defaultModel;

    try {
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: model.split(":")[1],
          input: {
            prompt: prompt,
            width: options.width || 512,
            height: options.height || 512,
            quality: options.quality || 25,
            style: options.style || "cinematic",
            num_outputs: 1,
            scheduler: "K_EULER",
            num_inference_steps: 50,
            guidance_scale: 7.5,
            apply_watermark: false,
            negative_prompt: "blurry, low quality, distorted, ugly, deformed, text, watermark, signature"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      const result = await this.pollForCompletion(prediction.id);
      
      if (result && result.output && result.output.length > 0) {
        return {
          url: result.output[0],
          prompt: prompt,
          model: model,
          metadata: {
            itemName,
            itemType,
            predictionId: prediction.id
          }
        };
      }

      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }

  /**
   * Create a prompt for D&D item image generation
   */
  private static createItemPrompt(itemName: string, itemType: string): string {
    const basePrompt = `A detailed, high-quality D&D fantasy ${itemType}, ${itemName}, isolated on transparent background, cinematic lighting, 4k resolution, professional photography style`;
    
    // Add specific styling based on item type
    const typePrompts: Record<string, string> = {
      weapon: "weapon, sharp, metallic, battle-worn, fantasy weapon design",
      armor: "armor, protective gear, metallic, fantasy armor design, medieval style",
      potion: "potion bottle, magical liquid, glowing, fantasy potion, glass bottle",
      scroll: "magical scroll, ancient parchment, glowing runes, fantasy spell scroll",
      ring: "magical ring, precious metal, gemstone, fantasy jewelry",
      wand: "magical wand, wooden staff, glowing tip, fantasy spellcasting tool",
      book: "ancient tome, leather bound, magical book, fantasy grimoire",
      coin: "gold coins, treasure, fantasy currency, metallic shine",
      gem: "precious gemstone, crystal, fantasy treasure, sparkling",
      food: "fantasy food, rations, medieval cuisine, hearty meal",
      tool: "fantasy tool, craftsmanship, medieval equipment, utility item"
    };

    const typePrompt = typePrompts[itemType.toLowerCase()] || "fantasy item, magical, detailed";
    
    return `${basePrompt}, ${typePrompt}`;
  }

  /**
   * Poll for prediction completion
   */
  private static async pollForCompletion(predictionId: string, maxAttempts: 30 = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            "Authorization": `Token ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Polling error: ${response.status}`);
        }

        const prediction = await response.json();

        if (prediction.status === "succeeded") {
          return prediction;
        } else if (prediction.status === "failed") {
          throw new Error(`Image generation failed: ${prediction.error}`);
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error("Image generation timed out");
  }

  /**
   * Generate multiple item images
   */
  static async generateMultipleItemImages(items: Array<{name: string, type?: string}>): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    
    for (const item of items) {
      try {
        const image = await this.generateItemImage(item.name, item.type);
        if (image) {
          results.push(image);
        }
      } catch (error) {
        console.error(`Failed to generate image for ${item.name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get available models
   */
  static getAvailableModels(): Record<string, string> {
    return {
      "sdxl": "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      "midjourney": "midjourney/diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      "realistic": "cjwbw/realistic-vision-v5:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4"
    };
  }
} 