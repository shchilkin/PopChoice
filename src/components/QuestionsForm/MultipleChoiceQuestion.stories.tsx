import { useState } from 'react';

import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

import type { Meta } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Components/Multiple Choice Question',
  component: MultipleChoiceQuestion,
};

export default meta;

export const SingleSelect = () => {
  const [selected, setSelected] = useState('');
  return (
    <MultipleChoiceQuestion
      question="What are you in the mood for?"
      options={['Fun', 'Serious', 'Inspiring', 'Scary']}
      selectedValue={selected}
      onChange={(value) => {
        if (typeof value === 'string') setSelected(value);
      }}
    />
  );
};

export const SingleSelectWithPreselected = () => {
  const [selected, setSelected] = useState('Classic');
  return (
    <MultipleChoiceQuestion
      question="Are you in the mood for something new or a classic?"
      options={['New', 'Classic']}
      selectedValue={selected}
      onChange={(value) => {
        if (typeof value === 'string') setSelected(value);
      }}
    />
  );
};

export const MultiSelect = () => {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <MultipleChoiceQuestion
      question="What moods are you in the mood for? (Select multiple)"
      options={['Fun', 'Serious', 'Inspiring', 'Scary']}
      selectedValue={selected}
      onChange={(value) => {
        if (Array.isArray(value)) setSelected(value);
      }}
      multiSelect={true}
    />
  );
};

export const MultiSelectWithPreselected = () => {
  const [selected, setSelected] = useState<string[]>(['Fun', 'Inspiring']);
  return (
    <MultipleChoiceQuestion
      question="What moods are you in the mood for? (Select multiple)"
      options={['Fun', 'Serious', 'Inspiring', 'Scary']}
      selectedValue={selected}
      onChange={(value) => {
        if (Array.isArray(value)) setSelected(value);
      }}
      multiSelect={true}
    />
  );
};

export const ManyOptionsSingleSelect = () => {
  const [selected, setSelected] = useState('');
  return (
    <MultipleChoiceQuestion
      question="Pick your favorite genre:"
      options={['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Documentary']}
      selectedValue={selected}
      onChange={(value) => {
        if (typeof value === 'string') setSelected(value);
      }}
    />
  );
};

export const ManyOptionsMultiSelect = () => {
  const [selected, setSelected] = useState<string[]>(['Action', 'Comedy']);
  return (
    <MultipleChoiceQuestion
      question="Pick your favorite genres (multiple allowed):"
      options={['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Documentary']}
      selectedValue={selected}
      onChange={(value) => {
        if (Array.isArray(value)) setSelected(value);
      }}
      multiSelect={true}
    />
  );
};
