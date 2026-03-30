import React from 'react';

export type BaseButtonProps = {
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({
  children,
  className = '',
  disabled = false,
  ...props
}: BaseButtonProps) => {
  const baseClass =
    'mt-4 w-full px-4 py-4 font-bold text-xl rounded-lg transition-colors duration-200 ' +
    (disabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
      : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90');

  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
};
