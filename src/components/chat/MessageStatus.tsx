
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  deliveryStatus: 'sent' | 'delivered' | 'read';
  isOwnMessage: boolean;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ deliveryStatus, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  const getStatusIcon = () => {
    switch (deliveryStatus) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-end">
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
