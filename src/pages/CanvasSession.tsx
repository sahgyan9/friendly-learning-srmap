import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CollaborativeCanvas } from '@/components/canvas/CollaborativeCanvas';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const CanvasSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Session</h1>
          <p className="text-muted-foreground mb-4">
            The session ID is missing or invalid.
          </p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const handleLeaveSession = () => {
    navigate('/mentors');
  };

  return (
    <div className="h-screen">
      <CollaborativeCanvas
        sessionId={sessionId}
        onLeave={handleLeaveSession}
      />
    </div>
  );
};