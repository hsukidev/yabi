import { useCallback, useState } from 'react';
import { TRACKER_PREFERENCE_STORAGE_KEY } from '../context/TrackerPreferenceProvider';
import { STORAGE_KEY as MULE_STORAGE_KEY } from '../persistence/muleStorage';
import { USER_PRESET_STORAGE_KEY } from '../persistence/userPresetStorage';

export const ONBOARDED_KEY = 'onboarded';

export const introRecessedCardStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
  background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
  boxShadow:
    'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
  padding: '14px 16px',
};

export const ONBOARDING_STEPS = [
  {
    step: '01 · WORLD & ROSTER',
    title: 'Pick your world and add mules',
    body: 'Choose a Heroic (Kronos, Hyperion, Solis) or Interactive world, then add your main and bossing mules with optional Nexon Ranking lookup.',
  },
  {
    step: '02 · BOSSES & PRESETS',
    title: 'Select boss crystals in one click',
    body: 'Apply CRA, Lomien, Ctene, or custom boss presets, set party sizes from solo to 6-man, and track daily, weekly, and monthly Black Mage clears.',
  },
  {
    step: '03 · WEEKLY CAP & MESO',
    title: 'Track per-world meso & 180 cap',
    body: 'See contributed weekly meso per character, automatic top-180 weekly crystal cap cuts, income share percentages, and reset completion marks.',
  },
] as const;

/**
 * Keys that only exist in localStorage after a user has actively used the app
 * (selected a world, saved mules, saved presets, or changed settings). Passive
 * layout keys written on mount (`theme`, `density`, `display`,
 * `lastSeenChangelog`) are intentionally excluded so a brand-new visitor still
 * sees the onboarding intro even across page reloads until they click Begin.
 */
const EXISTING_USER_KEYS = [
  MULE_STORAGE_KEY,
  'world',
  USER_PRESET_STORAGE_KEY,
  TRACKER_PREFERENCE_STORAGE_KEY,
  'slateDisplayMode',
] as const;

function readInitialOnboarded(): boolean {
  try {
    const explicit = localStorage.getItem(ONBOARDED_KEY);
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;

    const hasExistingData = EXISTING_USER_KEYS.some((key) => localStorage.getItem(key) !== null);
    if (hasExistingData) {
      localStorage.setItem(ONBOARDED_KEY, 'true');
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function useOnboarding() {
  const [onboarded, setOnboarded] = useState<boolean>(readInitialOnboarded);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      // Storage unavailable — transition in memory.
    }
    setOnboarded(true);
  }, []);

  return { onboarded, completeOnboarding };
}
