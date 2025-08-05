'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2, Sword, Shield, Star } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  class: string | null;
  level: number;
  race: string | null;
  background: string | null;
  ability_scores: any;
  skills: any;
  spells: any;
  equipment: any;
  inventory: any;
  conditions: any;
  experience_points: number;
  hit_points: number | null;
  max_hit_points: number | null;
  armor_class: number | null;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
}

export default function CharacterEditPage() {
  const { id: campaignId, characterId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [character, setCharacter] = useState<Character | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    hit_points: 0,
    max_hit_points: 0,
    armor_class: 10,
    experience_points: 0,
    ability_scores: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    },
    skills: '',
    spells: '',
    equipment: '',
    inventory: ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadCharacterData();
  }, [characterId, user, router]);

  const loadCharacterData = async () => {
    try {
      console.log('Loading character data for:', { characterId, campaignId, userId: user?.id });
      
      // Load character
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .eq('user_id', user?.id)
        .single();

      if (characterError) {
        console.error('Character query error:', characterError);
        throw characterError;
      }
      
      if (!characterData) {
        throw new Error('Character not found');
      }
      
      console.log('Character data loaded:', characterData);
      setCharacter(characterData);

      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user?.id)
        .single();

      if (campaignError) {
        console.error('Campaign query error:', campaignError);
        throw campaignError;
      }
      
      if (!campaignData) {
        throw new Error('Campaign not found');
      }
      
      console.log('Campaign data loaded:', campaignData);
      setCampaign(campaignData);

      // Initialize form data with safe defaults
      const safeAbilityScores = characterData.ability_scores || {
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
      };
      
      // Safely handle JSONB fields that might not exist in older characters
      const safeSkills = characterData.skills || [];
      const safeSpells = characterData.spells || [];
      const safeEquipment = characterData.equipment || [];
      const safeInventory = characterData.inventory || [];
      
      setFormData({
        name: characterData.name || '',
        class: characterData.class || '',
        level: characterData.level || 1,
        race: characterData.race || '',
        background: characterData.background || '',
        hit_points: characterData.hit_points || 0,
        max_hit_points: characterData.max_hit_points || 0,
        armor_class: characterData.armor_class || 10,
        experience_points: characterData.experience_points || 0,
        ability_scores: safeAbilityScores,
        skills: Array.isArray(safeSkills) ? JSON.stringify(safeSkills, null, 2) : '',
        spells: Array.isArray(safeSpells) ? JSON.stringify(safeSpells, null, 2) : '',
        equipment: Array.isArray(safeEquipment) ? JSON.stringify(safeEquipment, null, 2) : '',
        inventory: Array.isArray(safeInventory) ? JSON.stringify(safeInventory, null, 2) : ''
      });

    } catch (error) {
      console.error('Error loading character data:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        characterId,
        campaignId,
        userId: user?.id
      });
      setLoadError(error instanceof Error ? error.message : 'Failed to load character data');
    } finally {
      setLoading(false);
    }
  };

  const saveCharacter = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        class: formData.class || null,
        level: formData.level,
        race: formData.race || null,
        background: formData.background || null,
        hit_points: formData.hit_points,
        max_hit_points: formData.max_hit_points,
        armor_class: formData.armor_class,
        experience_points: formData.experience_points,
        ability_scores: formData.ability_scores,
        skills: formData.skills ? JSON.parse(formData.skills) : null,
        spells: formData.spells ? JSON.parse(formData.spells) : null,
        equipment: formData.equipment ? JSON.parse(formData.equipment) : null,
        inventory: formData.inventory ? JSON.parse(formData.inventory) : null,
      };

      const { error } = await supabase
        .from('characters')
        .update(updateData)
        .eq('id', characterId);

      if (error) throw error;

      // Reload character data
      await loadCharacterData();
    } catch (error) {
      console.error('Error saving character:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async () => {
    if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

      if (error) throw error;
      router.push(`/campaigns/${campaignId}`);
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  const updateAbilityScore = (ability: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      ability_scores: {
        ...prev.ability_scores,
        [ability]: Math.max(1, Math.min(20, value))
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading character...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading character</p>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}`)} className="mt-4">
            Back to Campaign
          </Button>
        </div>
      </div>
    );
  }

  if (!character || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Character not found</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}`)} className="mt-4">
            Back to Campaign
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
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Edit Character</h1>
            <p className="text-muted-foreground">
              {campaign.title} • {character.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveCharacter} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="destructive" onClick={deleteCharacter}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Character
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Character Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    placeholder="e.g., Fighter, Wizard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="race">Race</Label>
                  <Input
                    id="race"
                    value={formData.race}
                    onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                    placeholder="e.g., Human, Elf"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Character background story..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Combat Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Combat Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="hit_points">Current HP</Label>
                  <Input
                    id="hit_points"
                    type="number"
                    min="0"
                    value={formData.hit_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, hit_points: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_hit_points">Max HP</Label>
                  <Input
                    id="max_hit_points"
                    type="number"
                    min="1"
                    value={formData.max_hit_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_hit_points: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="armor_class">Armor Class</Label>
                  <Input
                    id="armor_class"
                    type="number"
                    min="1"
                    value={formData.armor_class}
                    onChange={(e) => setFormData(prev => ({ ...prev, armor_class: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_points">Experience Points</Label>
                <Input
                  id="experience_points"
                  type="number"
                  min="0"
                  value={formData.experience_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience_points: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ability Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Ability Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(formData.ability_scores).map(([ability, score]) => (
                  <div key={ability} className="space-y-2">
                    <Label htmlFor={ability} className="capitalize">{ability.toUpperCase()}</Label>
                    <Input
                      id={ability}
                      type="number"
                      min="1"
                      max="20"
                      value={score}
                      onChange={(e) => updateAbilityScore(ability, parseInt(e.target.value) || 10)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills, Spells, Equipment, Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Skills, spells, equipment, and inventory (JSON format)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                  placeholder='["Acrobatics", "Athletics", "Stealth"]'
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spells">Spells</Label>
                <Textarea
                  id="spells"
                  value={formData.spells}
                  onChange={(e) => setFormData(prev => ({ ...prev, spells: e.target.value }))}
                  placeholder='["Magic Missile", "Fireball"]'
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment</Label>
                <Textarea
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  placeholder='["Longsword", "Chain Mail", "Backpack"]'
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory">Inventory</Label>
                <Textarea
                  id="inventory"
                  value={formData.inventory}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventory: e.target.value }))}
                  placeholder='["50 gold pieces", "Healing Potion", "Rope"]'
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 