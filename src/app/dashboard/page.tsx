'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, MessageSquare, Trash2, LogOut } from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadChats();
  }, [user, router]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([
          {
            user_id: user?.id,
            title: 'New Chat',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      router.push(`/chat/${data.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      // Delete messages first (due to foreign key constraint)
      await supabase.from('messages').delete().eq('chat_id', chatId);
      
      // Then delete the chat
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      
      if (error) throw error;
      setChats(chats.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Create New Chat */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Chats
            </CardTitle>
            <CardDescription>
              Create a new chat or continue an existing conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createNewChat} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Start New Chat
            </Button>
          </CardContent>
        </Card>

        {/* Chat List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chats.map((chat) => (
            <Card key={chat.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg truncate">{chat.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteChat(chat.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  {new Date(chat.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/chat/${chat.id}`)}
                >
                  Continue Chat
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {chats.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first conversation by creating a new chat
              </p>
              <Button onClick={createNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Chat
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 