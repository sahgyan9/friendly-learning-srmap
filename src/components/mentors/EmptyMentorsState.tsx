
import React from 'react';

interface EmptyMentorsStateProps {
  message?: string;
  description?: string;
}

const EmptyMentorsState = ({ 
  message = "No mentors found", 
  description = "Try adjusting your search or browse all available mentors."
}: EmptyMentorsStateProps) => {
  return (
    <div className="text-center py-12">
      <h3 className="text-xl font-medium mb-2">{message}</h3>
      <p className="text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

export default EmptyMentorsState;
