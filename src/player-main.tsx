import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles/baseline.css';
import '@mantine/core/styles/default-css-variables.css';
import '@mantine/core/styles/global.css';
import '@mantine/core/styles/ActionIcon.css';
import '@mantine/core/styles/Alert.css';
import '@mantine/core/styles/Anchor.css';
import '@mantine/core/styles/AspectRatio.css';
import '@mantine/core/styles/Center.css';
import '@mantine/core/styles/Group.css';
import '@mantine/core/styles/Input.css';
import '@mantine/core/styles/Loader.css';
import '@mantine/core/styles/Paper.css';
import '@mantine/core/styles/Slider.css';
import '@mantine/core/styles/Stack.css';
import '@mantine/core/styles/Text.css';
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
