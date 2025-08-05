'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sword, Users, Play, MessageSquare } from 'lucide-react';
import CampaignChat from '@/components/CampaignChat';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed';
}

interface Character {
  id: string;
  name: string;
  class: string | null;
  level: number;
  race: string | null;
  experience_points: number;
  hit_points: number | null;
  max_hit_points: number | null;
  armor_class: number | null;
}

export default function PlayPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadCampaignData();
  }, [id, user]);

  const loadCampaignData = async () => {
    try {
      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Load characters
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      if (charactersError) throw charactersError;
      setCharacters(charactersData || []);

      // Auto-select first character if available
      if (charactersData && charactersData.length > 0) {
        setSelectedCharacter(charactersData[0].id);
        // Load or create session for this character
        await loadOrCreateSession(charactersData[0].id);
      }

    } catch (error) {
      console.error('Error loading campaign data:', error);
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateSession = async (characterId: string) => {
    try {
      // First, try to find an existing active session for this character
      const { data: existingSession, error: findError } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', id)
        .eq('character_id', characterId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw findError;
      }

      if (existingSession) {
        // Use existing session
        setCurrentSession(existingSession.id);
        console.log('Using existing session:', existingSession.id);
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert([
            {
              user_id: user?.id,
              campaign_id: id,
              character_id: characterId,
              title: `Session ${new Date().toLocaleDateString()}`,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        setCurrentSession(newSession.id);
        console.log('Created new session:', newSession.id);
      }
    } catch (error) {
      console.error('Error loading/creating session:', error);
    }
  };

  const handleCharacterChange = async (newCharacterId: string) => {
    setSelectedCharacter(newCharacterId);
    await loadOrCreateSession(newCharacterId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Campaign not found</p>
          <Button onClick={() => router.push('/campaigns')} className="mt-4">
            Back to Campaigns
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
            onClick={() => router.push(`/campaigns/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <p className="text-muted-foreground">
              Playing as {selectedCharacter ? characters.find(c => c.id === selectedCharacter)?.name : 'No character selected'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Character:</span>
            <Select value={selectedCharacter} onValueChange={handleCharacterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select character" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>
                    {character.name} (Level {character.level} {character.race} {character.class})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Game Interface */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Character Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="h-5 w-5" />
                  Character Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCharacter ? (
                  <div className="space-y-4">
                    {(() => {
                      const character = characters.find(c => c.id === selectedCharacter);
                      if (!character) return null;
                      
                      return (
                        <>
                          <div>
                            <h3 className="font-semibold text-lg">{character.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Level {character.level} {character.race} {character.class}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">HP:</span>
                              <div className="font-medium">
                                {character.hit_points || 0}/{character.max_hit_points || 0}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">AC:</span>
                              <div className="font-medium">{character.armor_class || 10}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">XP:</span>
                              <div className="font-medium">{character.experience_points}</div>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/campaigns/${id}/characters/${character.id}`)}
                            className="w-full"
                          >
                            Edit Character
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">No character selected</p>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/campaigns/${id}`)}
                    >
                      Create Character
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <CampaignChat 
              campaignId={id as string}
              characterId={selectedCharacter}
              sessionId={currentSession}
              onCharacterUpdate={(updatedCharacter) => {
                setCharacters(prev => 
                  prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c)
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 