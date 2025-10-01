import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { useAuth } from '@/context/AuthContext';
import { useCanvasSession } from '@/hooks/useCanvasSession';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CanvasToolbar } from './CanvasToolbar';
import { ParticipantsList } from './ParticipantsList';
import { Loader2, Users, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface CollaborativeCanvasProps {
  sessionId: string;
  onLeave?: () => void;
}

export const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({ 
  sessionId, 
  onLeave 
}) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const {
    session,
    participants,
    isLoading,
    error,
    canvasState,
    cursors,
    isMentor,
    canEdit,
    canClear,
    updateToolSettings,
    startDrawing,
    continueDrawing,
    endDrawing,
    addText,
    clearCanvas,
    updateCursor,
    leaveSession,
    endSession
  } = useCanvasSession({ sessionId });

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    console.log('Initializing Fabric canvas...');
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      isDrawingMode: true, // Start in drawing mode
    });

    // Configure drawing brush
    const brush = new PencilBrush(canvas);
    brush.color = '#000000';
    brush.width = 2;
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);
    console.log('Fabric canvas initialized successfully');

    return () => {
      console.log('Disposing Fabric canvas');
      canvas.dispose();
    };
  }, []);

  // Update canvas tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    console.log('Updating tool settings:', canvasState.toolSettings);

    if (canvasState.toolSettings.tool === 'pen') {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = canvasState.toolSettings.color;
        fabricCanvas.freeDrawingBrush.width = canvasState.toolSettings.width;
      }
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  }, [fabricCanvas, canvasState.toolSettings]);

  // Handle canvas events
  useEffect(() => {
    if (!fabricCanvas) return;

    const handlePathCreated = (event: any) => {
      const path = event.path;
      const pathData = {
        id: `path_${Date.now()}_${user?.id}`,
        points: path.path,
        color: canvasState.toolSettings.color,
        width: canvasState.toolSettings.width,
        tool: 'pen' as const,
        userId: user?.id || '',
        timestamp: Date.now()
      };

      // Save drawing to backend
      // This will be handled by the drawing service
    };

    const handleMouseMove = (event: any) => {
      const pointer = fabricCanvas.getPointer(event.e);
      updateCursor(pointer.x, pointer.y, true);
    };

    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('mouse:move', handleMouseMove);

    return () => {
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('mouse:move', handleMouseMove);
    };
  }, [fabricCanvas, canvasState.toolSettings, user?.id, updateCursor]);

  // Render existing strokes
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear canvas and redraw all strokes
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';

    // Add existing strokes to canvas
    canvasState.strokes.forEach(stroke => {
      // Convert stroke data to Fabric.js path
      // This would need proper path conversion logic
    });

    // Add text annotations
    canvasState.texts.forEach(text => {
      // Add text objects to canvas
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, canvasState.strokes, canvasState.texts]);

  const handleClearCanvas = useCallback(async () => {
    if (!canClear) {
      toast.error('Only the mentor can clear the canvas');
      return;
    }

    try {
      await clearCanvas();
      if (fabricCanvas) {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        fabricCanvas.renderAll();
      }
      toast.success('Canvas cleared');
    } catch (error) {
      toast.error('Failed to clear canvas');
    }
  }, [canClear, clearCanvas, fabricCanvas]);

  const handleLeaveSession = useCallback(async () => {
    try {
      await leaveSession();
      onLeave?.();
      toast.success('Left session');
    } catch (error) {
      toast.error('Failed to leave session');
    }
  }, [leaveSession, onLeave]);

  const handleEndSession = useCallback(async () => {
    try {
      await endSession();
      onLeave?.();
      toast.success('Session ended');
    } catch (error) {
      toast.error('Failed to end session');
    }
  }, [endSession, onLeave]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading canvas session...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Session Error</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={onLeave}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{session?.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participants.length} participants</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>

          {canClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCanvas}
            >
              Clear Canvas
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveSession}
          >
            Leave
          </Button>

          {isMentor && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
            >
              End Session
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Participants Panel */}
        {showParticipants && (
          <div className="w-64 border-r bg-muted/20">
            <ParticipantsList 
              participants={participants}
              cursors={cursors}
            />
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="border-b p-2">
            <CanvasToolbar
              toolSettings={canvasState.toolSettings}
              onToolChange={updateToolSettings}
              canEdit={canEdit}
            />
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-muted p-4">
            <div className="mx-auto w-fit">
              <canvas
                ref={canvasRef}
                className="border-2 border-border bg-white shadow-xl rounded-sm"
              />

              {/* Render other users' cursors */}
              {cursors.map(cursor => (
                <div
                  key={cursor.userId}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: cursor.x,
                    top: cursor.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: cursor.color }}
                  />
                  <div 
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.userName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};