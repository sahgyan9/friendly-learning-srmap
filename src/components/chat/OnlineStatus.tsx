
import React from 'react';

interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ 
  isOnline, 
  size = 'sm', 
  showText = false 
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex items-center gap-1">
      <div 
        className={`
          rounded-full border-2 border-background
          ${sizeClasses[size]}
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
      />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
