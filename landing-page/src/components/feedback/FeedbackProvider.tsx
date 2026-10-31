import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './feedback.css';

import {
  Button,
  createTheme,
  MantineProvider,
  v8CssVariablesResolver,
  type CSSVariablesResolver,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

const theme = createTheme({
  fontFamily: "'InterVariable', 'Inter', system-ui, sans-serif",
  fontWeights: { medium: '500' },
  headings: {
    fontFamily: "'BricolageGrotesqueVariable', system-ui, sans-serif",
  },
  primaryColor: 'excalimate',
  autoContrast: true,
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
  components: {
    Button: Button.extend({
      classNames: {
        root: 'feedback-button',
      },
    }),
  },
});

const cssVariablesResolver: CSSVariablesResolver = (currentTheme) => {
  const v8Variables = v8CssVariablesResolver(currentTheme);
  return {
    ...v8Variables,
    variables: {
      ...v8Variables.variables,
      '--mantine-color-dimmed': 'var(--tx3)',
      '--mantine-color-placeholder': 'var(--tx3)',
    },
  };
};

interface Props {
  children: ReactNode;
}

export function FeedbackProvider({ children }: Props) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <Notifications position="bottom-right" pauseResetOnHover="notification" />
      {children}
    </MantineProvider>
  );
}
