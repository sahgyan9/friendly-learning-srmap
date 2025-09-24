import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { joinCanvasSession } from '@/integrations/supabase/services/canvas';
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
import { Card } from '@/components/ui/card';
import { Loader2, Users, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface JoinSessionModalProps {
  onSessionJoined: (sessionId: string) => void;
  trigger?: React.ReactNode;
}

export const JoinSessionModal: React.FC<JoinSessionModalProps> = ({
  onSessionJoined,
  trigger
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('You must be logged in to join a session');
      return;
    }

    if (!sessionCode.trim()) {
      toast.error('Please enter a session code');
      return;
    }

    setIsLoading(true);

    try {
      const { data: session, error } = await joinCanvasSession({
        sessionCode: sessionCode.trim().toUpperCase()
      }, user.id);

      if (error || !session) {
        throw error || new Error('Failed to join session');
      }

      toast.success(`Joined "${session.title}" successfully!`);
      onSessionJoined(session.id);
      setIsOpen(false);
      setSessionCode('');

    } catch (error) {
      console.error('Error joining session:', error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          toast.error('Session code not found. Please check the code and try again.');
        } else if (error.message.includes('full')) {
          toast.error('This session is currently full. Please try again later.');
        } else if (error.message.includes('inactive')) {
          toast.error('This session has ended or is no longer active.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to join session. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Auto-uppercase and limit to 6 characters
    const cleanCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setSessionCode(cleanCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Hash className="h-4 w-4" />
            Join Session
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Canvas Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionCode">Session Code *</Label>
            <Input
              id="sessionCode"
              value={sessionCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter 6-character code"
              disabled={isLoading}
              maxLength={6}
              className="text-center text-lg font-mono tracking-wider"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-character code shared by your mentor
            </p>
          </div>

          {/* Info Card */}
          <Card className="p-4 bg-muted/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              What to expect
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Real-time collaborative drawing</li>
              <li>• See other participants' cursors</li>
              <li>• Interactive learning experience</li>
              <li>• Tools for drawing and text</li>
            </ul>
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
              disabled={isLoading || !sessionCode.trim() || sessionCode.length !== 6}
              className="flex-1 gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Join Session
            </Button>
          </div>
        </form>

        {/* Tips */}
        <div className="pt-4 border-t">
          <h5 className="text-sm font-medium mb-2">Tips:</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Session codes are case-insensitive</li>
            <li>• Make sure you have a stable internet connection</li>
            <li>• You can leave and rejoin anytime during the session</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};