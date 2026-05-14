import type { ComponentType } from 'react';
import LavaLamp from './LavaLamp';
import GameOfLife from './GameOfLife';
import Smoke from './Smoke';

export interface EffectMeta {
  id: string;
  name: string;
  description: string;
  tags: string[];
  component: ComponentType;
}

// ---------------------------------------------------------------------------
// Effect registry — add new effects here to make them appear in the sidebar.
// Each entry needs: id, name, description, tags, and a React component that
// fills its container (100% width × 100% height).
// ---------------------------------------------------------------------------

export const effects: EffectMeta[] = [
  {
    id: 'lava-lamp',
    name: 'Lava Lamp',
    description: 'Metaball blobs of warm color that rise, merge, and split',
    tags: ['metaballs', 'animation', 'color'],
    component: LavaLamp,
  },
  {
    id: 'game-of-life',
    name: 'Game of Life',
    description: "Conway's cellular automaton on the GPU — cell age drives color",
    tags: ['compute', 'simulation', 'cellular automaton'],
    component: GameOfLife,
  },
  {
    id: 'smoke',
    name: 'Smoke',
    description: 'Monochrome particle smoke — soft gaussian blobs that rise and drift',
    tags: ['particles', 'compute', 'monochrome'],
    component: Smoke,
  },
];
