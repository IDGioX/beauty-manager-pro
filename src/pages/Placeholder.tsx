import React from 'react';

interface PlaceholderProps {
  title: string;
  description: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title, description }) => {
  return (
    <div className="card text-center py-12">
      <h2 className="text-2xl font-heading font-semibold text-gray-900 mb-2">
        {title}
      </h2>
      <p className="text-gray-600">{description}</p>
      <p className="text-sm text-gray-500 mt-4">
        Questa funzionalità sarà implementata prossimamente
      </p>
    </div>
  );
};
