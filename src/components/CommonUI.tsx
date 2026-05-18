import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

// Animation Presets
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// Container Primitives
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  className, 
  size = 'lg',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[90rem]',
    full: 'max-w-full'
  };

  return (
    <div 
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Primitives
interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'primary' | 'secondary' | 'glass' | 'outline';
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ 
  children, 
  className, 
  variant = 'primary',
  hover = false,
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-navy-900 border-navy-700/50',
    secondary: 'bg-navy-800 border-navy-700/30',
    glass: 'bg-navy-900/40 backdrop-blur-md border-white/5',
    outline: 'bg-transparent border-navy-700/50'
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-2xl border transition-all duration-200',
        variants[variant],
        hover && 'hover:border-navy-600 hover:shadow-lg hover:shadow-black/20',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';

// Section Primitives
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon: Icon,
  className
}) => {
  return (
    <div className={cn('flex items-center justify-between pb-4 border-b border-navy-700/50 mb-6', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-navy-800 rounded-lg text-brand-gold shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-display font-bold text-text-primary tracking-tight leading-none">{title}</h2>
          {subtitle && <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Empty State Primitive
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-navy-900/50 rounded-3xl border border-dashed border-navy-700/50">
      {Icon && (
        <div className="p-4 bg-navy-800 rounded-2xl text-text-muted/30 mb-4">
          <Icon size={40} />
        </div>
      )}
      <h3 className="text-lg font-bold text-text-primary mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

// Button Primitives
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  iconPosition = 'left',
  disabled,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-navy-800 text-text-primary border-navy-700 hover:bg-navy-700 hover:border-navy-600',
    secondary: 'bg-white/10 text-white border-white/10 hover:bg-white/20',
    outline: 'bg-transparent border-navy-700 text-text-primary hover:bg-navy-800',
    danger: 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20',
    ghost: 'bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-white/5',
    gold: 'bg-brand-gold text-navy-950 font-black hover:brightness-110 shadow-lg shadow-brand-gold/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-base rounded-2xl',
    icon: 'p-2.5 rounded-xl'
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : Icon && iconPosition === 'left' && (
        <Icon size={size === 'sm' ? 14 : 18} className={cn(children ? 'mr-2' : '')} />
      )}
      {children}
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : 18} className={cn(children ? 'ml-2' : '')} />
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Badge Primitives
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gold' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className 
}) => {
  const variants = {
    default: 'bg-navy-800 text-text-secondary border-navy-700',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    gold: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    outline: 'bg-transparent text-text-muted border-navy-700'
  };

  return (
    <span className={cn(
      'px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const ProgressBar = ({ progress, className, label }: { progress: number, className?: string, label?: string }) => {
  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-muted">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-navy-950 rounded-full overflow-hidden border border-navy-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-brand-gold shadow-glow-gold"
        />
      </div>
    </div>
  );
};
