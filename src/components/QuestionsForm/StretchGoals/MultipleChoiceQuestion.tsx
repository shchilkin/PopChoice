import { FC, useId, useState } from 'react';

interface MultipleChoiceQuestionProps {
  question: string;
  options: string[];
  // Controlled state props
  selectedValue?: string; // Current selected value
  onChange?: (value: string) => void; // Callback when selection changes
  // Optional: for radio button grouping
  name?: string; // Radio button group name
}

export const MultipleChoiceQuestion: FC<MultipleChoiceQuestionProps> = ({
  question,
  options,
  selectedValue,
  onChange,
  name = 'multiple-choice', // Default name
}: MultipleChoiceQuestionProps) => {
  const uniqueId = useId();
  const [internalValue, setInternalValue] = useState<string>('');
  const isControlled = selectedValue !== undefined;
  const currentValue = isControlled ? selectedValue : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }

    onChange?.(newValue);
  };

  return (
    <div>
      <p className="text-md font-regular text-start w-full dark:text-gray-300 mb-2">{question}</p>
      <div className="flex flex-row gap-2">
        {options.map((option) => {
          const id = `${uniqueId}-${option}`;
          const isSelected = currentValue === option;

          return (
            <div className="flex flex-row gap-1" key={id}>
              <input
                type="radio"
                id={id}
                name={name}
                value={option}
                checked={isSelected}
                onChange={() => handleChange(option)}
                className="peer opacity-0 absolute w-0 h-0" // Visually hidden but keyboard accessible
              />
              <label
                htmlFor={id}
                className={`cursor-pointer px-4 py-1 rounded-lg border transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 ${
                  isSelected
                    ? 'bg-amber-300 text-black border-amber-300'
                    : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
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
