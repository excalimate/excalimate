import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/App/App';
import { initializeAnalyticsFromConsent } from './services/analytics/posthog';

initializeAnalyticsFromConsent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
