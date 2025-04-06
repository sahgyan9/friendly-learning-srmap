
import React from 'react';

interface ViewAllLinkProps {
  url: string;
  text?: string;
}

const ViewAllLink = ({ 
  url, 
  text = "View all mentors →" 
}: ViewAllLinkProps) => {
  return (
    <div className="text-center mt-8">
      <a 
        href={url} 
        className="text-primary font-medium hover:underline"
      >
        {text}
      </a>
    </div>
  );
};

export default ViewAllLink;
