
import React from 'react';

interface MentorFormHeaderProps {
  title?: string;
  description?: string;
}

const MentorFormHeader = ({
  title = "Become a Mentor",
  description = "A few minutes to fill in, and your profile is live as soon as you're done."
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
