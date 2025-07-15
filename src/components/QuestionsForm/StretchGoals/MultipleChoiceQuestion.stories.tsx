import { useState } from 'react';

import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

import type { Meta } from '@storybook/nextjs-vite';

const meta: Meta = {
  title: 'Components/Stretch Goals/Multiple Choice Question',
  component: MultipleChoiceQuestion,
};

export default meta;

export const Default = () => {
  const [selected, setSelected] = useState('');
  return (
    <MultipleChoiceQuestion
      question="What are you in the mood for?"
      options={['Fun', 'Serious', 'Inspiring', 'Scary']}
      selectedValue={selected}
      onChange={setSelected}
    />
  );
};

export const WithPreselected = () => {
  const [selected, setSelected] = useState('Classic');
  return (
    <MultipleChoiceQuestion
      question="Are you in the mood for something new or a classic?"
      options={['New', 'Classic']}
      selectedValue={selected}
      onChange={setSelected}
    />
  );
};

export const ManyOptions = () => {
  const [selected, setSelected] = useState('');
  return (
    <MultipleChoiceQuestion
      question="Pick your favorite genre:"
      options={['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Documentary']}
      selectedValue={selected}
      onChange={setSelected}
    />
  );
};
