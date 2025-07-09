import React from 'react';

export type BaseButtonProps = {
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ children, className = '', ...props }: BaseButtonProps) => {
  const baseClass =
    'mt-4 w-full px-4 py-4 font-bold text-xl bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800';

  return (
    <button
      className={`${baseClass} ${className}`}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
};
