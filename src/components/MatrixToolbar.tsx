import { memo, useState } from 'react';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { UserPresetPopover } from './UserPresetPopover';
import { SlateViewToggle } from './SlateViewToggle';
import type { SlateDisplayMode } from '../hooks/useSlateDisplayMode';
import type { UserPreset } from '../data/userPresets';

export type CadenceFilter = 'All' | 'Weekly' | 'Daily';
export type PresetKey = 'CRA' | 'LOMIEN' | 'CTENE' | 'CUSTOM';

interface MatrixToolbarProps {
  filter: CadenceFilter;
  onFilterChange: (next: CadenceFilter) => void;
  /** The single currently-lit **Preset Pill**, or `null` when none matches. */
  activePill: PresetKey | null;
  /**
   * Apply a **Canonical Preset** (CRA / LOMIEN / CTENE). The toolbar
   * never invokes this with `'CUSTOM'` — that pill is the popover
   * trigger and handled in-component.
   */
  onApplyPreset: (preset: PresetKey) => void;
  /** Invoked when the Matrix Reset button is clicked. */
  onReset: () => void;
  /** Library of saved User Presets — threaded into the popover. */
  userPresets: readonly UserPreset[];
  /** Current Boss Slate keys; the popover snapshots these on save. */
  slateKeys: readonly string[];
  /** The currently-matching User Preset, if any (highlighted in the popover). */
  matchedUserPreset: UserPreset | null;
  /** Save the current slate as a new User Preset under `name`. */
  onSaveUserPreset: (name: string, slateKeys: readonly string[]) => void;
  /** Delete a saved User Preset by id. */
  onDeleteUserPreset: (presetId: string) => void;
  /** Apply a saved User Preset by id (replaces the slate atomically). */
  onApplyUserPreset: (presetId: string) => void;
  /** Current **Slate Display Mode** driving the Slate View Toggle's pressed state. */
  slateDisplayMode: SlateDisplayMode;
  /** Select a Slate Display Mode (cards / matrix). */
  onSelectSlateDisplayMode: (mode: SlateDisplayMode) => void;
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

const CANONICAL_PRESETS: readonly Exclude<PresetKey, 'CUSTOM'>[] = ['CRA', 'LOMIEN', 'CTENE'];

export const MatrixToolbar = memo(function MatrixToolbar({
  filter,
  onFilterChange,
  activePill,
  onApplyPreset,
  onReset,
  userPresets,
  slateKeys,
  matchedUserPreset,
  onSaveUserPreset,
  onDeleteUserPreset,
  onApplyUserPreset,
  slateDisplayMode,
  onSelectSlateDisplayMode,
}: MatrixToolbarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Apply dismisses the popover; save and delete leave it open so the
  // user can confirm the new entry / keep tidying without re-opening.
  const handleApplyUserPreset = (presetId: string) => {
    onApplyUserPreset(presetId);
    setPopoverOpen(false);
  };
  const handleSaveUserPreset = (name: string, keys: readonly string[]) => {
    onSaveUserPreset(name, keys);
  };

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
        {CANONICAL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={activePill === preset ? 'on' : ''}
            onClick={() => onApplyPreset(preset)}
          >
            {preset}
          </button>
        ))}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={activePill === 'CUSTOM' ? 'on' : ''}
                aria-haspopup="dialog"
                aria-expanded={popoverOpen}
              >
                CUSTOM
              </button>
            }
          />
          <UserPresetPopover
            userPresets={userPresets}
            slateKeys={slateKeys}
            matchedUserPreset={matchedUserPreset}
            onApply={handleApplyUserPreset}
            onSave={handleSaveUserPreset}
            onDelete={onDeleteUserPreset}
          />
        </Popover>
      </div>
      <div className="ml-auto max-[339.99px]:ml-0">
        <SlateViewToggle mode={slateDisplayMode} onSelect={onSelectSlateDisplayMode} />
      </div>
      <button
        type="button"
        onClick={onReset}
        className="d-toolbar-reset ml-2 max-[339.99px]:ml-0 max-[339.99px]:basis-full max-[339.99px]:w-full max-[339.99px]:text-center max-[339.99px]:p-2  max-[339.99px]:border max-[339.99px]:border-border max-[339.99px]:rounded-[8px]"
        style={{ opacity: 0.6 }}
      >
        Reset
      </button>
    </div>
  );
});
