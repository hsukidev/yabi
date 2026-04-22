import { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type CadenceFilter = 'All' | 'Weekly' | 'Daily';
export type PresetKey = 'CRA' | 'LOMIEN' | 'CTENE' | 'CUSTOM';

interface MatrixToolbarProps {
  filter: CadenceFilter;
  onFilterChange: (next: CadenceFilter) => void;
  /** The single currently-lit **Preset Pill**, or `null` when none matches. */
  activePill: PresetKey | null;
  onApplyPreset: (preset: PresetKey) => void;
  /** Invoked when the Matrix Reset button is clicked. */
  onReset: () => void;
}

function CadenceIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      style={{ marginRight: 4 }}
    >
      {children}
    </svg>
  );
}

const CADENCES: ReadonlyArray<{ value: CadenceFilter; icon: React.ReactNode }> = [
  { value: 'All', icon: null },
  {
    value: 'Weekly',
    icon: (
      <CadenceIcon>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </CadenceIcon>
    ),
  },
  {
    value: 'Daily',
    icon: (
      <CadenceIcon>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </CadenceIcon>
    ),
  },
];

const PRESETS: readonly PresetKey[] = ['CRA', 'LOMIEN', 'CTENE', 'CUSTOM'];

export function MatrixToolbar({
  filter,
  onFilterChange,
  activePill,
  onApplyPreset,
  onReset,
}: MatrixToolbarProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      <div className="@max-[544.99px]/drawer:basis-full">
        <div className="d-c-toggle inline-flex" role="group" aria-label="Cadence filter">
          {CADENCES.map(({ value, icon }) => (
            <button
              key={value}
              type="button"
              className={`uppercase ${filter === value ? 'on' : ''}`}
              onClick={() => onFilterChange(value)}
            >
              {icon}
              {value}
            </button>
          ))}
        </div>
      </div>
      <span
        className="d-toolbar-sep @max-[544.99px]/drawer:hidden"
        aria-hidden
        style={{ margin: '0 8px' }}
      />
      <div className="d-c-toggle" role="group" aria-label="Boss presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={activePill === preset ? 'on' : ''}
            onClick={() => onApplyPreset(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
      <Tooltip open={infoOpen} onOpenChange={setInfoOpen}>
        <TooltipTrigger
          aria-label="Weekly preset info"
          closeOnClick={false}
          onClick={() => setInfoOpen(true)}
          className="ml-1.5 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Info className="size-3.5 " aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Weekly preset</TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={onReset}
        className="d-toolbar-reset ml-auto"
        style={{ opacity: 0.6 }}
      >
        Reset
      </button>
    </div>
  );
}
