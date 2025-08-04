import OpenAI from 'openai';

// Initialize OpenRouter client
const createOpenRouterClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "Dungeon Master",
    },
  });
};

// Types for OpenRouter requests
export interface OpenRouterRequest {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Main function to get completion from OpenRouter
export async function getOpenRouterCompletion(
  request: OpenRouterRequest
): Promise<OpenRouterResponse> {
  const client = createOpenRouterClient();

  const completion = await client.chat.completions.create({
    model: request.model || "openrouter/horizon-beta",
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: false, // Force non-streaming for this function
  });

  return {
    content: completion.choices[0].message.content || '',
    usage: completion.usage,
  };
}

// Helper function for simple text completions
export async function simpleCompletion(
  prompt: string,
  model: string = "openrouter/horizon-beta"
): Promise<string> {
  const response = await getOpenRouterCompletion({
    messages: [{ role: 'user', content: prompt }],
    model,
  });
  return response.content;
}

// Helper function for image analysis
export async function analyzeImage(
  imageUrl: string,
  prompt: string = "What is in this image?",
  model: string = "openrouter/horizon-beta"
): Promise<string> {
  const response = await getOpenRouterCompletion({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    model,
  });
  return response.content;
} 