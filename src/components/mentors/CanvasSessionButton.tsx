import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CreateSessionModal } from '@/components/canvas/CreateSessionModal';
import { JoinSessionModal } from '@/components/canvas/JoinSessionModal';
import { Palette, Hash } from 'lucide-react';
import { toast } from 'sonner';

export const CanvasSessionButton: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const isMentor = profile?.role === 'mentor' || profile?.role === 'both';

  const handleSessionCreated = (sessionId: string, sessionCode: string) => {
    toast.success(`Session created! Code: ${sessionCode}`);
    navigate(`/canvas/${sessionId}`);
  };

  const handleSessionJoined = (sessionId: string) => {
    navigate(`/canvas/${sessionId}`);
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={() => navigate('/signin')}
        className="gap-2"
      >
        <Palette className="h-4 w-4" />
        Sign in for Canvas
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      {isMentor && (
        <CreateSessionModal
          onSessionCreated={handleSessionCreated}
          trigger={
            <Button className="gap-2">
              <Palette className="h-4 w-4" />
              Start Canvas
            </Button>
          }
        />
      )}

      <JoinSessionModal
        onSessionJoined={handleSessionJoined}
        trigger={
          <Button variant="outline" className="gap-2">
            <Hash className="h-4 w-4" />
            Join Canvas
          </Button>
        }
      />
    </div>
  );
};