'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface CreateCampaignDialogProps {
  onCreateCampaign: (campaign: { title: string; description: string }) => Promise<void>;
  isCreating: boolean;
}

export default function CreateCampaignDialog({ onCreateCampaign, isCreating }: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '' });

  const handleCreate = async () => {
    if (!newCampaign.title.trim()) return;

    try {
      await onCreateCampaign(newCampaign);
      setNewCampaign({ title: '', description: '' });
      setOpen(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setNewCampaign({ title: '', description: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Start a new D&D adventure. Fill in the details below to create your campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Campaign Title *</Label>
            <Input
              id="title"
              placeholder="e.g., The Lost Mines of Phandelver"
              value={newCampaign.title}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newCampaign.title.trim()) {
                  handleCreate();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your campaign..."
              value={newCampaign.description}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !newCampaign.title.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 