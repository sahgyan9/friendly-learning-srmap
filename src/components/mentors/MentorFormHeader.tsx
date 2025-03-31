
import React from 'react';

interface MentorFormHeaderProps {
  title?: string;
  description?: string;
}

const MentorFormHeader = ({
  title = "Become a Mentor",
  description = "Share your knowledge and help other students excel in their academic journey."
}: MentorFormHeaderProps) => {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

export default MentorFormHeader;
