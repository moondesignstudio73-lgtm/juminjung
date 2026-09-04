import type { GamePhase } from './types.ts';

export function normalizeGamePhase(value: unknown): GamePhase {
  if (value === 'assignment' || value === 'management') return 'desk';
  const phases: GamePhase[] = [
    'title',
    'prologue',
    'desk',
    'night_management',
    'story',
    'night',
    'report',
    'ending',
  ];
  return phases.includes(value as GamePhase) ? (value as GamePhase) : 'title';
}
