'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Sword, Users, Calendar, Play, Edit, Trash2, LogOut } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  character_count?: number;
  session_count?: number;
}

export default function CampaignsPage() {
  const { user, signOut } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    loadCampaigns();
  }, [user, router]);

  const loadCampaigns = async () => {
    try {
      // Get campaigns with character and session counts
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          characters:characters(count),
          sessions:sessions(count)
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include counts
      const campaignsWithCounts = data?.map(campaign => ({
        ...campaign,
        character_count: campaign.characters?.[0]?.count || 0,
        session_count: campaign.sessions?.[0]?.count || 0,
      })) || [];

      setCampaigns(campaignsWithCounts);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.title.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user?.id,
            title: newCampaign.title.trim(),
            description: newCampaign.description.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setNewCampaign({ title: '', description: '' });
      await loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will also delete all characters and sessions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      await loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
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
          <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
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
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">
              Manage your D&D adventures
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Create New Campaign */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Campaign
            </CardTitle>
            <CardDescription>
              Start a new D&D adventure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., The Lost Mines of Phandelver"
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your campaign..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <Button 
              onClick={createCampaign} 
              disabled={isCreating || !newCampaign.title.trim()}
              className="w-full md:w-auto"
            >
              {isCreating ? 'Creating...' : 'Create Campaign'}
            </Button>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg truncate">{campaign.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {campaign.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sword className="h-4 w-4" />
                    <span>{campaign.character_count} Characters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{campaign.session_count} Sessions</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                  <Button
                    onClick={() => router.push(`/campaigns/${campaign.id}/play`)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    Play
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Sword className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to start your D&D adventure
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 