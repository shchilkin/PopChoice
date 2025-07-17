import React from 'react';

import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
};

export const Default = () => <Button>Click Me</Button>;

export const Disabled = () => <Button disabled>Disabled</Button>;
