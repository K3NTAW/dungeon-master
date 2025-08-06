'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sword, Users, User, Crown } from 'lucide-react';
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
  const [activeCharacters, setActiveCharacters] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!id) {
      console.error('No campaign ID provided');
      router.push('/campaigns');
      return;
    }
    loadCampaignData();
  }, [id, user, router]);

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

      // Load saved party state from localStorage
      const savedPartyState = localStorage.getItem(`party-state-${id}`);
      let savedActiveCharacters: string[] = [];
      let savedCurrentSpeaker: string = '';

      if (savedPartyState) {
        try {
          const parsed = JSON.parse(savedPartyState);
          savedActiveCharacters = parsed.activeCharacters || [];
          savedCurrentSpeaker = parsed.currentSpeaker || '';
        } catch (error) {
          console.error('Error parsing saved party state:', error);
        }
      }

      // Set party state - use saved state if available, otherwise default to first character
      if (charactersData && charactersData.length > 0) {
        if (savedActiveCharacters.length > 0 && savedCurrentSpeaker) {
          // Use saved state, but validate that characters still exist
          const validActiveCharacters = savedActiveCharacters.filter(charId => 
            charactersData.some(char => char.id === charId)
          );
          const validSpeaker = charactersData.some(char => char.id === savedCurrentSpeaker) 
            ? savedCurrentSpeaker 
            : validActiveCharacters[0] || charactersData[0].id;

          setActiveCharacters(validActiveCharacters.length > 0 ? validActiveCharacters : [charactersData[0].id]);
          setCurrentSpeaker(validSpeaker);
        } else {
          // Default to first character if no saved state
          const firstCharacterId = charactersData[0].id;
          setActiveCharacters([firstCharacterId]);
          setCurrentSpeaker(firstCharacterId);
        }
        
        // Load or create session for the campaign
        await loadOrCreateSession();
      } else {
        // No characters, but still create a session for the campaign
        await loadOrCreateSession();
      }

    } catch (error) {
      console.error('Error loading campaign data:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        campaignId: id,
        userId: user?.id
      });
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateSession = async () => {
    try {
      console.log('Loading/creating session for campaign:', id);
      
      // For party-based gameplay, we use one session per campaign
      const { data: existingSession, error: findError } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (findError) {
        console.log('Error finding existing session:', findError);
        // If it's a "not found" error, that's expected - we'll create a new session
        if (findError.code !== 'PGRST116') {
          throw findError;
        }
      }

      if (existingSession) {
        console.log('Found existing session:', existingSession.id);
        setCurrentSession(existingSession.id);
      } else {
        console.log('No existing session found, creating new one...');
        
        if (!campaign?.title) {
          throw new Error('Campaign title is required to create session');
        }

        if (!user?.id) {
          throw new Error('User ID is required to create session');
        }

        // Create new session for the campaign
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert([
            {
              user_id: user?.id,
              campaign_id: id,
              title: `${campaign.title} - Party Session`,
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating new session:', createError);
          throw createError;
        }
        
        if (!newSession) {
          throw new Error('Failed to create session - no data returned');
        }
        
        console.log('Created new session:', newSession.id);
        setCurrentSession(newSession.id);
      }
    } catch (error) {
      console.error('Error loading/creating session:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        campaignId: id,
        campaignTitle: campaign?.title
      });
      
      // Set a fallback session ID to prevent the app from breaking
      const fallbackSessionId = `fallback-${id}-${Date.now()}`;
      console.log('Using fallback session ID:', fallbackSessionId);
      setCurrentSession(fallbackSessionId);
    }
  };

  const handleCharacterToggle = (characterId: string) => {
    setActiveCharacters(prev => {
      let newActive: string[];
      let newSpeaker = currentSpeaker;

      if (prev.includes(characterId)) {
        // Remove character from party
        newActive = prev.filter(id => id !== characterId);
        // If removing current speaker, switch to first available character
        if (currentSpeaker === characterId && newActive.length > 0) {
          newSpeaker = newActive[0];
          setCurrentSpeaker(newActive[0]);
        }
      } else {
        // Add character to party
        newActive = [...prev, characterId];
        // If no current speaker, set this one
        if (!currentSpeaker) {
          newSpeaker = characterId;
          setCurrentSpeaker(characterId);
        }
      }

      // Save to localStorage
      const partyState = {
        activeCharacters: newActive,
        currentSpeaker: newSpeaker
      };
      localStorage.setItem(`party-state-${id}`, JSON.stringify(partyState));

      return newActive;
    });
  };

  const handleSpeakerChange = (characterId: string) => {
    if (activeCharacters.includes(characterId)) {
      setCurrentSpeaker(characterId);
      
      // Save to localStorage
      const partyState = {
        activeCharacters,
        currentSpeaker: characterId
      };
      localStorage.setItem(`party-state-${id}`, JSON.stringify(partyState));
    }
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

  const currentSpeakerCharacter = characters.find(c => c.id === currentSpeaker);
  const activeCharacterObjects = characters.filter(c => activeCharacters.includes(c.id));

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
              Party Adventure - {activeCharacterObjects.length} character{activeCharacterObjects.length !== 1 ? 's' : ''} active
            </p>
          </div>
        </div>

        {/* Party Management */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Party Management
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push(`/campaigns/${id}`)}
                >
                  Manage Characters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Character Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Available Characters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {characters.map((character) => {
                      const isActive = activeCharacters.includes(character.id);
                      const isSpeaker = currentSpeaker === character.id;
                      return (
                        <div
                          key={character.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isActive 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted bg-muted/20'
                          }`}
                          onClick={() => handleCharacterToggle(character.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {isSpeaker && <Crown className="h-4 w-4 text-yellow-500" />}
                                <span className="font-medium">{character.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Lv.{character.level} {character.class}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Active
                                </Badge>
                              )}
                              <div className="text-xs text-muted-foreground">
                                HP: {character.hit_points || 0}/{character.max_hit_points || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current Speaker Selection */}
                {activeCharacters.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Current Speaker</h3>
                    <Select value={currentSpeaker} onValueChange={handleSpeakerChange}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select speaking character" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCharacterObjects.map((character) => (
                          <SelectItem key={character.id} value={character.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {character.name} (Level {character.level} {character.class})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentSpeakerCharacter && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentSpeakerCharacter.name} will speak for the party
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Interface */}
        {activeCharacters.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Party Info Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="h-5 w-5" />
                    Party Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeCharacterObjects.map((character) => (
                      <div key={character.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">{character.name}</h3>
                          {currentSpeaker === character.id && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Level {character.level} {character.race} {character.class}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Game Area */}
            <div className="lg:col-span-3">
              <CampaignChat
                campaignId={id as string}
                characterId={currentSpeaker}
                sessionId={currentSession}
                partyCharacterIds={activeCharacters}
                onCharacterUpdate={(updatedCharacter) => {
                  setCharacters(prev => 
                    prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c)
                  );
                }}
              />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Characters Selected</h3>
              <p className="text-muted-foreground mb-4">
                Select at least one character to start your party adventure!
              </p>
              <Button onClick={() => router.push(`/campaigns/${id}`)}>
                Manage Characters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 