import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createCanvasSession } from '@/integrations/supabase/services/canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Palette, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CreateSessionModalProps {
  onSessionCreated: (sessionId: string, sessionCode: string) => void;
  trigger?: React.ReactNode;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  onSessionCreated,
  trigger
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maxParticipants: 10,
    backgroundColor: '#ffffff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('You must be logged in to create a session');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    setIsLoading(true);

    try {
      const { data: session, error } = await createCanvasSession({
        title: formData.title.trim(),
        maxParticipants: formData.maxParticipants
      }, user.id);

      if (error || !session) {
        throw error || new Error('Failed to create session');
      }

      toast.success('Canvas session created successfully!');
      onSessionCreated(session.id, session.session_code);
      setIsOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        maxParticipants: 10,
        backgroundColor: '#ffffff'
      });

    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Palette className="h-4 w-4" />
            Start Canvas Session
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Canvas Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Math Problem Solving"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of what you'll be teaching..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="2"
                max="50"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 10)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Canvas Color</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                  disabled={isLoading}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.backgroundColor}
                  onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Session Preview */}
          <Card className="p-4 bg-muted/20">
            <h4 className="font-medium mb-2">Session Preview</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Up to {formData.maxParticipants} participants</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Unlimited duration</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Real-time collaborative drawing</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="flex-1 gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};