'use client';
import { FC, useId, useState } from 'react';

interface MultipleChoiceQuestionProps {
  question: string;
  options: string[];
  // Controlled state props
  selectedValue?: string | string[]; // Support both single and multi-select
  onChange?: (value: string | string[]) => void; // Callback when selection changes
  // Optional: for radio button grouping
  name?: string; // Radio button group name
  multiSelect?: boolean; // Enable multi-select mode
}

export const MultipleChoiceQuestion: FC<MultipleChoiceQuestionProps> = ({
  question,
  options,
  selectedValue,
  onChange,
  name = 'multiple-choice', // Default name
  multiSelect = false,
}: MultipleChoiceQuestionProps) => {
  const uniqueId = useId();
  const [internalValue, setInternalValue] = useState<string | string[]>(multiSelect ? [] : '');
  const isControlled = selectedValue !== undefined;
  const currentValue = isControlled ? selectedValue : internalValue;

  const handleChange = (option: string) => {
    let newValue: string | string[];

    if (multiSelect) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      if (currentArray.includes(option)) {
        // Remove option if already selected
        newValue = currentArray.filter((item) => item !== option);
      } else {
        // Add option if not selected
        newValue = [...currentArray, option];
      }
    } else {
      newValue = option;
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }

    onChange?.(newValue);
  };

  return (
    <div>
      <p className="text-md font-regular text-start w-full text-[var(--foreground)] mb-2">
        {question}
        {multiSelect && (
          <span className="text-xs text-[var(--muted-foreground)] ml-2">(multi-select)</span>
        )}
      </p>
      <div className="flex flex-row gap-2 flex-wrap">
        {options.map((option) => {
          const id = `${uniqueId}-${option}`;
          const isSelected = multiSelect
            ? Array.isArray(currentValue) && currentValue.includes(option)
            : currentValue === option;

          return (
            <div className="flex flex-row gap-1" key={id}>
              <input
                type={multiSelect ? 'checkbox' : 'radio'}
                id={id}
                name={name}
                value={option}
                checked={isSelected}
                onChange={() => handleChange(option)}
                className="peer opacity-0 absolute w-0 h-0" // Visually hidden but keyboard accessible
              />
              <label
                htmlFor={id}
                className={`cursor-pointer px-4 py-1 rounded-lg border transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)]'
                    : 'border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]'
                }`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleChange(option);
                  }
                }}
              >
                {option}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
