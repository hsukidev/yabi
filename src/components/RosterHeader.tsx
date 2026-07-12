import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { DensityToggle } from './DensityToggle';
import { DisplayToggle } from './DisplayToggle';
import { WorldSelect } from './WorldSelect';
import { MarkAsMenu, type MarkEligibleCounts } from './MarkAsMenu';
import type { ClearMarkKind } from '../utils/clearMark';

export interface RosterHeaderProps {
  muleCount: number;
  bulkMode: boolean;
  selectedCount: number;
  /** Whole World-Lens roster is selected — flips the Select all link to Clear selection. */
  allSelected: boolean;
  /** Eligible Bulk-Selected Mule counts per cadence, for the Mark As Menu rows. */
  markEligibleCounts: MarkEligibleCounts;
  onEnterBulk: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  /** Toggle a Clear Mark across the eligible Bulk-Selected Mules. */
  onMarkAs: (kind: ClearMarkKind) => void;
}

// `--destructive` is stored as a full `hsl(...)` call, not a raw triplet, so
// we can't use `hsl(var(--destructive) / <alpha>)`. `color-mix` lets us blend
// the theme token with transparent to produce the same alpha variants while
// keeping all reds theme-token-driven (no #e05040 literals). The Bulk Action
// Bar's own chrome is neutral/accent; only the destructive Delete/Yes controls
// reach for these.
const destructive = 'var(--destructive)';
const destructiveAlpha = (pct: number) =>
  `color-mix(in oklab, var(--destructive) ${pct}%, transparent)`;

// Accent chrome for the Bulk Action Bar frame, dot, and count pill.
const accent = 'var(--accent-raw, var(--accent))';
const accentAlpha = (pct: number) =>
  `color-mix(in oklab, var(--accent-raw, var(--accent)) ${pct}%, transparent)`;

export function RosterHeader({
  muleCount,
  bulkMode,
  selectedCount,
  allSelected,
  markEligibleCounts,
  onEnterBulk,
  onCancel,
  onDelete,
  onSelectAll,
  onClearSelection,
  onMarkAs,
}: RosterHeaderProps) {
  const isTouch = useMatchMedia('(pointer: coarse)');

  // Inline Delete confirmation. The Delete trigger (in-bar on pointer, in the
  // Delete Pill on touch) swaps its cluster in place to `Delete N? [Yes]
  // [Cancel]` — no bar-wide takeover. Confirming never exits the mode; the
  // confirm's Cancel just backs out to the normal cluster.
  const [confirming, setConfirming] = useState(false);
  const showConfirm = confirming && selectedCount > 0;

  // Leaving Bulk Select Mode resets the confirm so re-entry starts clean.
  useEffect(() => {
    if (!bulkMode) setConfirming(false);
  }, [bulkMode]);

  // Keep focus inside the cluster the confirm replaced (a11y).
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (showConfirm) yesRef.current?.focus();
  }, [showConfirm]);

  const handleConfirmDelete = () => {
    onDelete();
    setConfirming(false);
  };

  if (bulkMode) {
    // Right-cluster confirm UI, shared by the in-bar (pointer) surface.
    const inlineConfirm = (
      <div data-bulk-delete-confirm className="flex items-center gap-2">
        <span style={{ color: destructive, fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>
          Delete {selectedCount}?
        </span>
        <Button ref={yesRef} size="sm" variant="destructive" onClick={handleConfirmDelete}>
          Yes
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );

    return (
      <>
        <div
          data-bulk-action-bar
          className="mb-4 flex items-center justify-between gap-3"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: `1px solid ${accentAlpha(35)}`,
            background: accentAlpha(8),
            animation: 'bulk-slide 0.22s ease-out',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              data-bulk-accent-dot
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accent,
                boxShadow: `0 0 10px ${accentAlpha(60)}`,
                flexShrink: 0,
              }}
            />
            <span
              data-bulk-selection-pill
              style={{
                padding: '3px 9px',
                borderRadius: 999,
                background: accentAlpha(18),
                border: `1px solid ${accentAlpha(40)}`,
                color: accent,
                fontFamily: 'Geist Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.12em',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {selectedCount} SELECTED
            </span>
            <button
              type="button"
              data-bulk-select-all
              onClick={allSelected ? onClearSelection : onSelectAll}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: accent,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textDecorationLine: 'underline',
                textUnderlineOffset: 3,
                textDecorationColor: accentAlpha(40),
                whiteSpace: 'nowrap',
              }}
            >
              {allSelected ? 'Clear selection' : 'Select all'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Mark As Menu lives in the bar on all pointer types (a sibling
                ticket adds Set Active/Inactive alongside it here). */}
            <MarkAsMenu
              selectedCount={selectedCount}
              eligibleCounts={markEligibleCounts}
              onMarkAs={onMarkAs}
            />
            {isTouch ? (
              // Touch: Delete lives in the Delete Pill; the bar keeps only the
              // mode-exit Cancel.
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : showConfirm ? (
              inlineConfirm
            ) : (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirming(true)}
                  disabled={selectedCount === 0}
                >
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
        {isTouch &&
          selectedCount > 0 &&
          // Portal to body — an ancestor section uses `animate-in
          // slide-in-from-bottom-4`, whose residual `transform` creates a
          // containing block that re-anchors `position: fixed` away from the
          // viewport. Rendering into `document.body` sidesteps that.
          createPortal(
            <div
              data-bulk-delete-pill
              className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 px-6"
            >
              {/* Surface-colored pill with a destructive border. Tapping the
                  trigger morphs it in place into its own Delete?/Yes/Cancel. */}
              <div
                className="mx-auto flex h-10 w-full max-w-md items-center justify-center gap-2 rounded-full px-4 shadow-lg"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${destructiveAlpha(45)}`,
                }}
              >
                {showConfirm ? (
                  <div data-bulk-delete-pill-confirm className="flex items-center gap-2">
                    <span style={{ color: destructive, fontWeight: 500, fontSize: 14 }}>
                      Delete {selectedCount}?
                    </span>
                    <Button
                      ref={yesRef}
                      size="sm"
                      variant="destructive"
                      onClick={handleConfirmDelete}
                    >
                      Yes
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="flex size-full  items-center justify-center"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: destructive,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    Delete {selectedCount}
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-px w-8 max-[399px]:hidden"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--accent-raw, var(--accent)))',
          }}
        />
        <h2 className="font-display text-2xl font-bold tracking-tight max-[399px]:hidden">
          Roster
        </h2>
        <WorldSelect />
      </div>
      <div className="flex items-center gap-3">
        {muleCount > 1 && (
          <p
            className="eyebrow-plain hidden sm:block"
            style={{ opacity: 0.6, fontSize: 12, lineHeight: 1 }}
          >
            drag to reorder
          </p>
        )}
        <DisplayToggle />
        <DensityToggle />
        {muleCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Enter bulk select mode"
            onClick={onEnterBulk}
          >
            <ListChecks data-icon="inline-start" />
            Select
          </Button>
        )}
      </div>
    </div>
  );
}
