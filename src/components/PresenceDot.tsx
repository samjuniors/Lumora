import React from 'react';
import { motion } from 'motion/react';

interface PresenceDotProps {
  status?: 'online' | 'idle' | 'offline';
  className?: string;
  showLabel?: boolean;
}

export const PresenceDot: React.FC<PresenceDotProps> = ({ status = 'offline', className = '', showLabel = false }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'online': return 'Active';
      case 'idle': return 'Away';
      case 'offline': return 'Disconnected';
      default: return 'Offline';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} id={`presence-${status}`}>
      <div className="relative flex h-3 w-3">
        {status === 'online' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
};
