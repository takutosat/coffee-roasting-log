// src/components/Card.tsx

import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string; // Tailwind CSSのクラス名を追加できるようにする
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${className || ''}`}>
      {title && <h2 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;