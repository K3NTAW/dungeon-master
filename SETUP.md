# Dungeon Master - Setup Guide

This guide will help you set up the Dungeon Master chat application with Supabase authentication and database.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- An OpenRouter API key (for AI chat functionality)

## 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter Configuration (for AI chat)
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings > API
3. Copy the "Project URL" and "anon public" key
4. Paste them in your `.env.local` file

### Getting OpenRouter API Key

1. Go to [openrouter.ai](https://openrouter.ai) and create an account
2. Navigate to your API keys section
3. Create a new API key
4. Add it to your `.env.local` file

## 2. Database Setup

1. In your Supabase project, go to the SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create the necessary tables and policies

## 3. Install Dependencies

```bash
npm install
```

## 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 5. Features

### Authentication
- Email/password sign up and sign in
- Magic link authentication
- Protected routes with middleware
- Automatic session management

### Chat Management
- Create new chats
- View chat history
- Delete chats
- Real-time message updates
- Persistent message storage

### AI Integration
- OpenRouter integration for AI responses
- Message history context
- Automatic chat title generation

## 6. Database Schema

### Tables

**chats**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `title` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**messages**
- `id` (UUID, Primary Key)
- `chat_id` (UUID, Foreign Key to chats)
- `role` (Text: 'user' | 'assistant')
- `content` (Text)
- `created_at` (Timestamp)

### Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only access their own chats and messages
- All operations are properly authenticated
- Data is isolated between users

## 7. Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy

### Supabase Hosting

The database is hosted on Supabase, which provides:
- Automatic backups
- Real-time subscriptions
- Row Level Security
- Built-in authentication

## 8. Troubleshooting

### Common Issues

1. **Authentication not working**: Check your Supabase URL and anon key
2. **Database errors**: Ensure you've run the schema SQL in Supabase
3. **Real-time not working**: Check that real-time is enabled in your Supabase project
4. **AI responses failing**: Verify your OpenRouter API key

### Support

If you encounter issues, check:
- Browser console for errors
- Supabase dashboard logs
- Vercel deployment logs (if deployed) 