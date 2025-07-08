import React from 'react';
import { QuestionCard } from './QuestionCard';

export default {
  title: 'Components/QuestionCard',
  component: QuestionCard,
};

export const Default = () => (
  <QuestionCard
    label="Sample Question"
    placeholder="This is a sample description for the question."
  />
);
