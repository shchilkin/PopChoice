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
                className="peer sr-only" // Hide input but keep accessible
              />
              <label
                htmlFor={id}
                className={`cursor-pointer px-4 py-1 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-amber-300 text-black border-amber-300'
                    : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
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
