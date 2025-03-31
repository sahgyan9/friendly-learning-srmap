
import React from 'react';

interface MentorsHeaderProps {
  title?: string;
  description?: string;
}

const MentorsHeader = ({ 
  title = "Find Your Mentor",
  description = "Browse our extensive list of qualified mentors or use the search to find someone with the specific skills you need."
}: MentorsHeaderProps) => {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        {description}
      </p>
    </div>
  );
};

export default MentorsHeader;
