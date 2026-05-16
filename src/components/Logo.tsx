import React from 'react';

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 160 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm transition-all"
      >
        {/* Abstract Geometric Lumora Prism */}
        <path d="M12 20L20 4L36 36L12 20Z" fill="#D4AF37" fillOpacity="0.4" />
        <path d="M28 20L20 4L12 36L28 20Z" fill="#D4AF37" fillOpacity="0.7" />
        <path d="M20 36L12 20L28 20L20 36Z" fill="#D4AF37" />

        {/* 'Lumora' Text */}
        <text
          x="44"
          y="27"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="24"
          letterSpacing="-0.03em"
          fill="currentColor"
        >
          Lumora
        </text>
      </svg>
    </div>
  );
};
