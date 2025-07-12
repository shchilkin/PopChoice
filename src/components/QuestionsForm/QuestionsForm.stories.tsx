import React from 'react';
import { QuestionsForm } from './QuestionsForm';

export default {
  title: 'Components/QuestionsForm',
  component: QuestionsForm,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export const Default = () => <QuestionsForm />;
