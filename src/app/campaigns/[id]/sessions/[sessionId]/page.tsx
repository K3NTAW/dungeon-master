'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import OpenRouterChat from '@/components/OpenRouterChat';

interface Session {
  id: string;
  title: string;
  campaign_id: string;
  character_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
}

export default function SessionPage() {
  const { id: campaignId, sessionId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadSessionData();
  }, [sessionId, user]);

  const loadSessionData = async () => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user?.id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user?.id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

    } catch (error) {
      console.error('Error loading session data:', error);
      router.push(`/campaigns/${campaignId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}`)} className="mt-4">
            Back to Campaign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground">
              {campaign.title} • {new Date(session.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Session Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Session Chat
            </CardTitle>
            <CardDescription>
              Continue your adventure with the AI Dungeon Master
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OpenRouterChat />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 