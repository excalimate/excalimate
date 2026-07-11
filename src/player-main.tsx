import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { createRoot } from 'react-dom/client';
import { PlayerApp } from './player/PlayerApp';
import './player/player.css';

const root = document.getElementById('root');
if (!root) throw new Error('Player root element is missing');

createRoot(root).render(
  <MantineProvider defaultColorScheme="dark">
    <PlayerApp />
  </MantineProvider>,
);
