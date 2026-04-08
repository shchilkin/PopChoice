import React from 'react';

export type ButtonVariant = 'default' | 'cta' | 'ghost';

export type BaseButtonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  default: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90',
  cta: 'text-[var(--pc-cta-text)] font-bold hover:opacity-90 active:scale-95',
  ghost:
    'bg-transparent text-[var(--pc-t2)] border border-[var(--pc-bd2)] hover:text-[var(--pc-t1)] hover:border-[var(--pc-bd4)]',
};

export const Button = ({
  children,
  className = '',
  disabled = false,
  variant = 'default',
  style,
  ...props
}: BaseButtonProps) => {
  const baseClass =
    'mt-4 w-full px-4 py-4 font-bold text-xl rounded-lg transition-all duration-200 ' +
    VARIANT_STYLES[variant] +
    (disabled ? ' cursor-not-allowed opacity-50' : '');

  const ctaStyle =
    variant === 'cta' && !disabled ? { background: 'var(--pc-cta)', ...style } : style;

  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled}
      style={ctaStyle}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
};
