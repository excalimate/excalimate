import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './feedback.css';

import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

const theme = createTheme({
  fontFamily: "'InterVariable', 'Inter', system-ui, sans-serif",
  headings: {
    fontFamily: "'BricolageGrotesqueVariable', system-ui, sans-serif",
  },
  primaryColor: 'excalimate',
  colors: {
    excalimate: [
      '#fff9db',
      '#fff0ad',
      '#ffe77c',
      '#ffdc45',
      '#ffd21a',
      '#ffc800',
      '#ffc300',
      '#e0a900',
      '#c89400',
      '#ad7f00',
    ],
  },
  defaultRadius: 'md',
});

interface Props {
  children: ReactNode;
}

export function FeedbackProvider({ children }: Props) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="bottom-right" />
      {children}
    </MantineProvider>
  );
}
