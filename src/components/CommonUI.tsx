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
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'flat';
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
    primary: 'card-premium',
    secondary: 'bg-bg-surface-soft border-white/5',
    glass: 'glass-card',
    outline: 'bg-transparent border-white/10',
    flat: 'bg-black/20 border-transparent'
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-2xl border transition-all duration-200',
        variants[variant],
        hover && 'hover:translate-y-[-2px] hover:shadow-xl hover:shadow-black/40 hover:border-white/10',
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
      <div className={cn('flex items-center justify-between gap-4 py-2 mb-6', className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-10 h-10 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-xl text-brand-gold shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary tracking-tight leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

// Button Primitives
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  isLoading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-white/[0.04] text-text-primary border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12]',
    secondary: 'bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/15',
    outline: 'bg-transparent border border-white/10 text-text-primary hover:bg-white/[0.04]',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
    gold: 'bg-brand-gold text-bg-main hover:brightness-110 shadow-md font-semibold',
    link: 'bg-transparent text-brand-gold p-0 h-auto hover:underline'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
    xl: 'px-8 py-4 text-lg rounded-2xl',
    icon: 'p-2 rounded-xl'
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'button-premium border transition-all duration-200 active:scale-95 disabled:scale-100',
        fullWidth ? 'w-full flex items-center justify-center' : 'inline-flex items-center justify-center',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
      ) : Icon && iconPosition === 'left' && (
        <Icon size={size === 'sm' ? 14 : 16} className={cn(children ? 'mr-2' : '')} />
      )}
      {children}
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : 16} className={cn(children ? 'ml-2' : '')} />
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
      'px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide border',
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

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: { 
  icon: LucideIcon, 
  title: string, 
  description: string, 
  action?: React.ReactNode,
  className?: string
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl", className)}>
      <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center text-text-muted/40 mb-6 border border-white/5">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-text-muted max-w-xs mx-auto mb-8 font-medium leading-relaxed">{description}</p>
      {action && action}
    </div>
  );
};
