# Dungeon Master - OpenRouter Integration

A Next.js application with OpenRouter integration for AI chat completions, built with shadcn/ui components.

## Features

- 🤖 OpenRouter API integration for AI chat completions
- 🎨 Modern UI with shadcn/ui components
- 📱 Responsive design
- 🔧 TypeScript support
- ⚡ Fast development with Next.js 14

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dungeon-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_NAME=Dungeon Master
   ```

4. **Get your OpenRouter API key**
   
   - Visit [OpenRouter](https://openrouter.ai/)
   - Sign up for an account
   - Navigate to your API keys section
   - Create a new API key
   - Copy the key to your `.env.local` file

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Start a conversation**: Type your message in the text area and press Enter or click Send
2. **Change models**: Use the model input field to specify different OpenRouter models
3. **View responses**: AI responses will appear in the chat interface

## Available Models

You can use any model available on OpenRouter. Some popular options include:

- `openrouter/horizon-beta` (default)
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4`
- `meta-llama/llama-3.1-8b-instruct`
- `google/gemini-pro`

## API Endpoints

### POST `/api/openrouter`

Sends a chat completion request to OpenRouter.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "openrouter/horizon-beta"
}
```

**Response:**
```json
{
  "content": "Hello! I'm doing well, thank you for asking...",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your site URL for OpenRouter rankings | No |
| `NEXT_PUBLIC_SITE_NAME` | Your site name for OpenRouter rankings | No |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Development

### Adding new shadcn/ui components

```bash
npx shadcn@latest add <component-name>
```

### Building for production

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
# dungeon-master
