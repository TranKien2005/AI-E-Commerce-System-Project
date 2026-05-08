import React from 'react';

interface PlaceholderProps {
  title: string;
  description: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title, description }) => {
  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ maxWidth: '560px', padding: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
    </div>
  );
};
