import type { BossTier } from '../types';

/** Pip / accent colour per Boss Tier, shared across Slate Display Modes. */
export const TIER_COLOR: Record<BossTier, string> = {
  easy: '#6fb878',
  normal: '#8fb3d9',
  hard: '#d98a3a',
  chaos: '#c94f8f',
  extreme: '#e8533a',
};

/** Capitalized display label per Boss Tier, shared across Slate Display Modes. */
export const TIER_HEADER_LABEL: Record<BossTier, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};
