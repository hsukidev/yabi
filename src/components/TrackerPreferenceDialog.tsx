import { Check } from 'lucide-react';
import { useTrackerPreference } from '@/context/TrackerPreferenceProvider';
import { EXTERNAL_TRACKERS } from '@/data/externalTrackers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackerPreferenceDialog({ open, onOpenChange }: Props) {
  const { trackerPreference, setTrackerPreference } = useTrackerPreference();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Tracker Preference</DialogTitle>
        </DialogHeader>
        <div role="radiogroup" aria-label="External Tracker" className="flex flex-col gap-2">
          {EXTERNAL_TRACKERS.map((tracker, index) => {
            const selected = tracker.id === trackerPreference;
            return (
              <button
                key={tracker.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTrackerPreference(tracker.id)}
                onKeyDown={(event) => {
                  const lastIndex = EXTERNAL_TRACKERS.length - 1;
                  const nextIndex =
                    event.key === 'ArrowDown' || event.key === 'ArrowRight'
                      ? index === lastIndex
                        ? 0
                        : index + 1
                      : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
                        ? index === 0
                          ? lastIndex
                          : index - 1
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? lastIndex
                            : null;
                  if (nextIndex === null) return;
                  event.preventDefault();
                  setTrackerPreference(EXTERNAL_TRACKERS[nextIndex].id);
                  const group = event.currentTarget.parentElement;
                  (group?.children[nextIndex] as HTMLElement | undefined)?.focus();
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-(--accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-(--accent-raw) bg-(--accent-soft)' : 'border-border'}`}
                data-selected={selected ? '' : undefined}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{tracker.name}</span>
                  <span className="text-sm text-muted-foreground">{tracker.domain}</span>
                </span>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border"
                  aria-hidden
                >
                  {selected && <Check className="size-3.5 text-(--accent-raw)" />}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
