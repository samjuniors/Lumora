import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ExpandableTextProps {
  text?: string;
  children?: React.ReactNode;
  maxLength?: number;
  maxHeight?: number;
  className?: string;
  textClassName?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({ 
  text, 
  children,
  maxLength = 100, 
  maxHeight = 100, // Used for children
  className,
  textClassName
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, text]);

  if (!text && !children) return null;

  const isTextMode = !!text;
  const shouldCollapse = isTextMode 
    ? text!.length > maxLength 
    : contentHeight > maxHeight;

  return (
    <div className={cn("flex flex-col", className)}>
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : (shouldCollapse ? (isTextMode ? 'auto' : maxHeight) : 'auto') }}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          !isExpanded && shouldCollapse && isTextMode ? "line-clamp-2 md:line-clamp-3" : "",
          textClassName
        )}
      >
        <div ref={contentRef}>
          {children || text}
        </div>
        {!isExpanded && shouldCollapse && !isTextMode && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </motion.div>
      {shouldCollapse && (
        <button
          onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
          className="mt-3 flex items-center gap-1 text-[11px] md:text-xs font-bold uppercase tracking-wider text-brand-gold hover:text-brand-gold self-start transition-colors"
        >
          {isExpanded ? (
            <>Read Less <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5" /></>
          ) : (
            <>Read More <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
};
