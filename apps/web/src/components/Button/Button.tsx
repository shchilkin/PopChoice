import React from 'react';

export type ButtonVariant = 'default' | 'cta' | 'ghost';
export type ButtonSize = 'legacy' | 'sm' | 'md' | 'lg' | 'icon';

export type BaseButtonProps = {
  children: React.ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-105 active:scale-[0.99]',
  cta: 'text-[var(--pc-cta-text)] font-bold shadow-[var(--pc-cta-shadow)] hover:brightness-105 hover:shadow-[var(--pc-cta-shadow-hover)] active:scale-[0.99]',
  ghost:
    'bg-transparent text-[var(--pc-t2)] border border-[var(--pc-bd2)] hover:bg-[var(--pc-ghost)] hover:text-[var(--pc-t1)] hover:border-[var(--pc-bd4)] active:scale-[0.99]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  legacy: 'mt-4 w-full rounded-lg px-4 py-4 text-xl font-bold',
  sm: 'rounded-lg px-3 py-1.5 text-xs',
  md: 'h-10 rounded-lg px-4 text-sm',
  lg: 'h-12 rounded-2xl px-4 text-sm',
  icon: 'h-10 w-10 rounded-full p-0',
};

export const Button = ({
  children,
  className = '',
  disabled = false,
  size = 'legacy',
  variant = 'default',
  style,
  ...props
}: BaseButtonProps) => {
  const baseClass =
    'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] ' +
    SIZE_STYLES[size] +
    ' ' +
    VARIANT_STYLES[variant] +
    (disabled ? ' pointer-events-none cursor-not-allowed opacity-50' : '');
  const buttonStyle = variant === 'cta' ? { background: 'var(--pc-cta)', ...style } : style;

  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled}
      style={buttonStyle}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
};
