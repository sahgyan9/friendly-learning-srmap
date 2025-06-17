
import React from 'react';
import { Loader2 } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: Array<{ user_id: string; is_typing: boolean }>;
  getUserName: (userId: string) => string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, getUserName }) => {
  if (typingUsers.length === 0) return null;

  const typingUserNames = typingUsers
    .filter(user => user.is_typing)
    .map(user => getUserName(user.user_id));

  if (typingUserNames.length === 0) return null;

  const getTypingText = () => {
    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`;
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    } else {
      return `${typingUserNames.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;
