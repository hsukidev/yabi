import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_TRACKER,
  isExternalTrackerId,
  type ExternalTrackerId,
} from '@/data/externalTrackers';

export const TRACKER_PREFERENCE_STORAGE_KEY = 'trackerPreference';

interface TrackerPreferenceContextValue {
  trackerPreference: ExternalTrackerId;
  setTrackerPreference: (tracker: ExternalTrackerId) => void;
}

const TrackerPreferenceContext = createContext<TrackerPreferenceContextValue | undefined>(
  undefined,
);

function readTrackerPreference(): ExternalTrackerId {
  try {
    const stored = localStorage.getItem(TRACKER_PREFERENCE_STORAGE_KEY);
    return isExternalTrackerId(stored) ? stored : DEFAULT_TRACKER;
  } catch {
    return DEFAULT_TRACKER;
  }
}

export function TrackerPreferenceProvider({ children }: { children: ReactNode }) {
  const [trackerPreference, setTrackerPreferenceState] =
    useState<ExternalTrackerId>(readTrackerPreference);

  const setTrackerPreference = useCallback(
    (tracker: ExternalTrackerId) => {
      if (tracker === trackerPreference) return;
      try {
        localStorage.setItem(TRACKER_PREFERENCE_STORAGE_KEY, tracker);
      } catch {
        // The live preference still works when browser storage is unavailable.
      }
      setTrackerPreferenceState(tracker);
    },
    [trackerPreference],
  );

  const value = useMemo(
    () => ({ trackerPreference, setTrackerPreference }),
    [trackerPreference, setTrackerPreference],
  );

  return (
    <TrackerPreferenceContext.Provider value={value}>{children}</TrackerPreferenceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTrackerPreference() {
  const context = useContext(TrackerPreferenceContext);
  if (!context) {
    throw new Error('useTrackerPreference must be used within TrackerPreferenceProvider');
  }
  return context;
}
