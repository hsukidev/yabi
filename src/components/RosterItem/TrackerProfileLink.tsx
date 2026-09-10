import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrackerPreference } from '@/context/TrackerPreferenceProvider';
import { buildTrackerProfileUrl, getExternalTracker } from '@/data/externalTrackers';
import { resolveRegion, type WorldId } from '@/data/worlds';

const stopBubble = (event: React.SyntheticEvent) => event.stopPropagation();

export const TrackerProfileLink = memo(function TrackerProfileLink({
  name,
  worldId,
}: {
  name: string;
  worldId?: WorldId;
}) {
  const { trackerPreference } = useTrackerPreference();
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const tracker = getExternalTracker(trackerPreference);
  const label = `View ${trimmedName} on ${tracker.name}`;
  const href = buildTrackerProfileUrl(trackerPreference, trimmedName, resolveRegion(worldId));

  return (
    <Tooltip>
      <TooltipTrigger
        render={<a href={href} target="_blank" rel="noopener noreferrer" draggable={false} />}
        aria-label={`${label} (opens in a new tab)`}
        delay={0}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onTouchStart={stopBubble}
        onKeyDown={stopBubble}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <ExternalLink className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent className="px-3 py-2 text-xs normal-case tracking-normal">
        View on {tracker.name}
      </TooltipContent>
    </Tooltip>
  );
});
