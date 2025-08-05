'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import SupabaseTest from '@/components/SupabaseTest';
import OpenRouterChat from '@/components/OpenRouterChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showOriginalChat, setShowOriginalChat] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/campaigns');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  if (showOriginalChat) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="text-center mb-8">
            <Button 
              variant="outline" 
              onClick={() => setShowOriginalChat(false)}
              className="mb-4"
            >
              ← Back to Login
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Dungeon Master - Original Chat</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered chat interface using OpenRouter
            </p>
          </div>
          <OpenRouterChat />
        </div>
      </main>
    );
  }

  return (
    <div>
      <LoginForm />
      <SupabaseTest />
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Testing Options</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowOriginalChat(true)}
            className="w-full"
          >
            Test Original Chat Interface
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
