import React from 'react';
import QuestionsPage from './page';

export default {
  title: 'Pages/Questions Page',
  component: QuestionsPage,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export const Default = () => <QuestionsPage />;
