
import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
}

const SectionHeader = ({ title, description }: SectionHeaderProps) => {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      {description && (
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
