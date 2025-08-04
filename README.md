# Dungeon Master - AI Chat Application

A modern Next.js chat application with Supabase authentication, persistent chat history, and AI integration using OpenRouter. Built with shadcn/ui components for a beautiful, responsive interface.

## ✨ Features

- 🔐 **Authentication**: Email/password and magic link authentication with Supabase
- 💬 **Chat Management**: Create, view, and delete conversations
- 🤖 **AI Integration**: Powered by OpenRouter with multiple AI models
- 💾 **Persistent Storage**: All chats and messages stored in Supabase
- ⚡ **Real-time Updates**: Live message updates using Supabase real-time
- 🎨 **Modern UI**: Beautiful interface built with shadcn/ui components
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🔒 **Secure**: Row Level Security ensures data privacy
- 🚀 **Fast**: Built with Next.js 15 and optimized for performance

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- OpenRouter API key

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd dungeon-master
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `supabase-schema.sql` in your Supabase SQL Editor
3. Copy your project URL and anon key to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 📖 Detailed Setup

See [SETUP.md](./SETUP.md) for comprehensive setup instructions.

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **shadcn/ui**: Modern component library
- **Tailwind CSS**: Utility-first styling

### Backend
- **Supabase**: Database, authentication, and real-time
- **OpenRouter**: AI model integration
- **Next.js API Routes**: Server-side API endpoints

### Database Schema
- **chats**: User conversations with titles and timestamps
- **messages**: Individual messages with role and content
- **Row Level Security**: Ensures data isolation between users

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Chat Management
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `DELETE /api/chats/[id]` - Delete chat

### Messages
- `GET /api/chats/[id]/messages` - Get chat messages
- `POST /api/chats/[id]/messages` - Send message

### AI Integration
- `POST /api/openrouter` - Get AI response

## 🎯 Key Features Explained

### Authentication Flow
1. Users sign up/in with email/password or magic link
2. Supabase handles session management
3. Middleware protects routes automatically
4. Users are redirected to dashboard after login

### Chat System
1. Users create new chats from dashboard
2. Each chat has a unique URL (`/chat/[id]`)
3. Messages are stored in Supabase with real-time updates
4. Chat titles are auto-generated from first message

### AI Integration
1. Messages are sent to OpenRouter API
2. AI responses are saved to database
3. Full conversation context is maintained
4. Multiple AI models supported

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

```bash
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [OpenRouter](https://openrouter.ai) for AI model access
- [shadcn/ui](https://ui.shadcn.com) for the beautiful components
- [Next.js](https://nextjs.org) for the excellent framework
