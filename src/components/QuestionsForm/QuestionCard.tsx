'use client';
import React, { useRef } from 'react';

interface QuestionCardProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  maxLength?: number;
  helperText?: string;
}

export const QuestionCard = ({
  label,
  placeholder,
  value = '',
  onChange,
  name,
  maxLength = 150,
  helperText,
}: QuestionCardProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    if (onChange) {
      onChange(e.target.value);
    }
  };

  if (!label) {
    return (
      <div className="flex flex-col gap-2 p-4 border border-[var(--rating-mature-bg)] bg-[var(--rating-mature-bg)]/10 rounded-lg">
        <span className="text-[var(--rating-mature-text)] font-semibold">Error:</span>
        <span className="text-[var(--rating-mature-text)] text-sm">Label is required.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-md font-regular text-start w-full text-[var(--foreground)]">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        maxLength={maxLength}
        className="w-full min-h-24 h-fit p-2 border border-[var(--border)] rounded-lg bg-[var(--input)] text-[var(--foreground)] resize-none overflow-hidden"
        placeholder={placeholder}
        onInput={handleInput}
      />

      {/* Helper text and character counter */}
      <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)]">
        {helperText && <span className="italic">{helperText}</span>}
        <span
          className={`${value.length > maxLength * 0.9 ? 'text-[var(--rating-teen-text)]' : ''}`}
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
};
