import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CanvasParticipantWithUser, CanvasCursor } from '@/types/canvas';
import { Crown, User, Circle } from 'lucide-react';

interface ParticipantsListProps {
  participants: CanvasParticipantWithUser[];
  cursors: CanvasCursor[];
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  cursors
}) => {
  const getCursorForUser = (userId: string) => {
    return cursors.find(cursor => cursor.userId === userId);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Session Participants</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {participants.length} online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map((participant) => {
          const cursor = getCursorForUser(participant.user_id);
          const isMentor = participant.role === 'mentor';
          const isActive = cursor?.isActive;

          return (
            <div 
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={participant.user_profile_image || undefined} 
                    alt={participant.user_name}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(participant.user_name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Active indicator */}
                <div className="absolute -bottom-1 -right-1">
                  {isActive ? (
                    <Circle 
                      className="h-3 w-3 fill-green-500 text-green-500" 
                    />
                  ) : (
                    <Circle 
                      className="h-3 w-3 fill-gray-400 text-gray-400" 
                    />
                  )}
                </div>

                {/* Cursor color indicator */}
                {cursor && (
                  <div 
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: cursor.color }}
                    title={`${participant.user_name}'s cursor`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {participant.user_name}
                  </span>
                  
                  {isMentor && (
                    <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={isMentor ? "default" : "secondary"}
                    className="text-xs px-1.5 py-0.5"
                  >
                    {isMentor ? 'Mentor' : 'Student'}
                  </Badge>
                  
                  {isActive && (
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-muted/20">
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
            <span>Currently active</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-3 w-3 text-yellow-500" />
            <span>Session mentor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Cursor position</span>
          </div>
        </div>
      </div>
    </div>
  );
};