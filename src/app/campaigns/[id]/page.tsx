'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Sword, Play, Edit, Trash2, UserPlus, MessageSquare } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
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
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function CampaignPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCharacter, setNewCharacter] = useState({ name: '', class: '', race: '' });
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
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

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', id)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

    } catch (error) {
      console.error('Error loading campaign data:', error);
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const createCharacter = async () => {
    if (!newCharacter.name.trim()) return;

    setIsCreatingCharacter(true);
    try {
      // First, generate character stats using AI
      const generateResponse = await fetch('/api/generate-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName: newCharacter.name.trim(),
          characterClass: newCharacter.class || 'Adventurer',
          characterRace: newCharacter.race || 'Human',
          campaignTitle: campaign?.title || 'Adventure',
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate character stats');
      }

      const generateData = await generateResponse.json();
      const { characterStats, welcomeMessage } = generateData;

      // Create character with AI-generated stats
      const { data, error } = await supabase
        .from('characters')
        .insert([
          {
            user_id: user?.id,
            campaign_id: id,
            name: newCharacter.name.trim(),
            class: newCharacter.class || null,
            race: newCharacter.race || null,
            level: 1,
            experience_points: 0,
            hit_points: characterStats.hit_points,
            max_hit_points: characterStats.max_hit_points,
            armor_class: characterStats.armor_class,
            ability_scores: characterStats.ability_scores,
            skills: characterStats.skills,
            spells: characterStats.spells,
            equipment: characterStats.equipment,
            inventory: characterStats.inventory,
            conditions: characterStats.conditions,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Store the welcome message for when the character first plays
      // (We'll add this to the first session when they start playing)

      setNewCharacter({ name: '', class: '', race: '' });
      await loadCampaignData();
      
      // Show success message
      alert(`Character created! ${welcomeMessage}`);
      
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Error creating character. Please try again.');
    } finally {
      setIsCreatingCharacter(false);
    }
  };

  const deleteCharacter = async (characterId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

      if (error) throw error;
      await loadCampaignData();
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  const createSession = async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .insert([
          {
            user_id: user?.id,
            campaign_id: id,
            title: `Session ${sessions.length + 1}`,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      router.push(`/campaigns/${id}/sessions/${sessionData.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const updateCampaignStatus = async (status: 'active' | 'paused' | 'completed') => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setCampaign(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Error updating campaign status:', error);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/campaigns')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <p className="text-muted-foreground">
              {campaign.description || 'No description'}
            </p>
          </div>
          <Select value={campaign.status} onValueChange={updateCampaignStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Characters Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Sword className="h-5 w-5" />
                  Characters ({characters.length})
                </CardTitle>
                <Button size="sm" onClick={() => router.push(`/campaigns/${id}/characters/create`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Character
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Character Creation */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Quick Add Character (AI-Generated Stats)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The AI DM will generate appropriate stats and welcome your new adventurer!
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    placeholder="Character name"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Class (optional)"
                    value={newCharacter.class}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, class: e.target.value }))}
                  />
                  <Input
                    placeholder="Race (optional)"
                    value={newCharacter.race}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, race: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={createCharacter} 
                  disabled={isCreatingCharacter || !newCharacter.name.trim()}
                  className="mt-3"
                  size="sm"
                >
                  {isCreatingCharacter ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      AI is generating character...
                    </>
                  ) : (
                    'Add Character'
                  )}
                </Button>
              </div>

              {/* Characters List */}
              <div className="space-y-2">
                {characters.map((character) => (
                  <div key={character.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{character.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Level {character.level} {character.race} {character.class}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>HP: {character.hit_points || 0}/{character.max_hit_points || 0}</span>
                        <span>AC: {character.armor_class || 10}</span>
                        <span>XP: {character.experience_points}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/campaigns/${id}/characters/${character.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCharacter(character.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {characters.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No characters yet. Create your first character to start playing!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sessions ({sessions.length})
                </CardTitle>
                <Button size="sm" onClick={createSession}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/campaigns/${id}/sessions/${session.id}`)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No sessions yet. Start your first session to begin the adventure!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Play Button */}
        <div className="mt-8 text-center">
          <Button 
            size="lg" 
            onClick={() => router.push(`/campaigns/${id}/play`)}
            className="px-8"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Playing
          </Button>
        </div>
      </div>
    </div>
  );
} 