
import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageStatusProps {
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'queued' | 'failed';
  isOwnMessage: boolean;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ deliveryStatus, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  const getStatusIcon = () => {
    switch (deliveryStatus) {
      // Written offline and still held by the outbox. A clock rather than a
      // tick, because a tick here would claim the other person can see it.
      case 'queued':
        return <Clock className="h-3 w-3 text-muted-foreground" aria-label="Waiting to send" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" aria-label="Not sent" />;
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
