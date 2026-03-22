import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/App/App';
import { PostHogProvider } from 'posthog-js/react';
import { getPostHogClient, isPostHogConfigured } from './services/analytics/posthog';

const posthogClient = isPostHogConfigured() ? getPostHogClient() : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {posthogClient ? (
      <PostHogProvider client={posthogClient}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
