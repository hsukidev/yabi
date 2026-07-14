import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Mule } from '../types';
import { useCurrentCycle } from '../hooks/useCurrentCycle';
import { isMarkValid, isMarkEligible } from '../utils/clearMark';
import { formatMeso } from '../utils/meso';
import { MuleBossSlate, type SlateKey } from '../data/muleBossSlate';
import type { PresetKey } from './MatrixToolbar';
import { resolveWorldGroup } from '../data/worlds';
import { useUserPresets } from '../hooks/useUserPresets';
import { useSlateDisplayMode } from '../hooks/useSlateDisplayMode';
import { BossMatrix } from './BossMatrix';
import { BossCardView } from './BossCardView';
import { BossSlateEmpty } from './BossSlateEmpty';
import { BossSearch } from './BossSearch';
import { MatrixToolbar } from './MatrixToolbar';
import { CharacterAvatar } from './CharacterAvatar';
import { MesoMetric } from './MesoDisplay';
import { useMuleIdentityDraft } from './MuleDetailDrawer/hooks/useMuleIdentityDraft';
import { useMatrixFilter } from './MuleDetailDrawer/hooks/useMatrixFilter';
import { usePartySizes } from './MuleDetailDrawer/hooks/usePartySizes';
import { useSlateActions } from './MuleDetailDrawer/hooks/useSlateActions';
import { CrystalTally } from './MuleDetailDrawer/CrystalTally';
import { MuleIdentityFields } from './MuleDetailDrawer/MuleIdentityFields';
import { MuleNotesField } from './MuleDetailDrawer/MuleNotesField';
import { MuleActionsMenu } from './RosterItem/MuleActionsMenu';
import { CompletionChecks } from './RosterItem/CompletionChecks';
import { CapDropTooltipTrigger } from './RosterItem/CapDropTooltipTrigger';
import type { RosterRowMetrics } from './rosterRowMetrics';
// Zero-state tone shared with the KPI income Progress Readouts.
import { ZERO_NUMERATOR_TONE } from './KpiProgressReadout';

interface MuleDetailDrawerProps {
  mule: Mule | null;
  metrics?: RosterRowMetrics | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
}

const HEADER_INCOME_CHIP_CLASS =
  'inline-flex items-baseline gap-2 rounded-lg border border-border/60 px-3 py-1.5 cursor-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const HEADER_INCOME_CHIP_STYLE = {
  background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
  boxShadow:
    'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
} satisfies CSSProperties;

const EMPTY_DROPPED_KEYS: ReadonlyMap<SlateKey, number> = new Map();

export function MuleDetailDrawer({
  mule,
  metrics,
  open,
  onClose,
  onUpdate,
  onDelete,
}: MuleDetailDrawerProps) {
  const muleId = mule?.id ?? null;
  const selectedBosses = useMemo(() => mule?.selectedBosses ?? [], [mule?.selectedBosses]);
  const worldGroup = resolveWorldGroup(mule?.worldId);
  const slate = useMemo(
    () => MuleBossSlate.from(selectedBosses, worldGroup),
    [selectedBosses, worldGroup],
  );

  // Header chip is always abbreviated, so the readout stays compact. Compute
  // raw straight off the slate and leave formatting at the render edge.
  const potentialIncomeRaw = useMemo(
    () => slate.totalCrystalValue(mule?.partySizes),
    [slate, mule?.partySizes],
  );
  const weeklyIncomeRaw = metrics?.displayedWeeklyMeso.meso ?? potentialIncomeRaw;
  const weeklyIncome = formatMeso(weeklyIncomeRaw, true);
  // Muted (fully dropped) keeps its dim tone; a plain 0 takes the KPI
  // card's zero tone (PROTOTYPE styling).
  const weeklyIncomeColor = metrics?.displayedWeeklyMeso.muted
    ? 'var(--dim, var(--surface-dim))'
    : weeklyIncomeRaw === 0
      ? ZERO_NUMERATOR_TONE
      : 'var(--accent-numeric)';
  const droppedKeys = metrics?.droppedKeys ?? EMPTY_DROPPED_KEYS;
  const monthlyIncomeRaw = useMemo(
    () => slate.monthlyCrystalValue(mule?.partySizes),
    [slate, mule?.partySizes],
  );
  const monthlyIncome = formatMeso(monthlyIncomeRaw, true);

  const matrixFilter = useMatrixFilter({ muleId, slate });
  const partySizes = usePartySizes({
    muleId,
    partySizes: mule?.partySizes,
    onUpdate,
  });
  const { userPresets, createUserPreset, deleteUserPreset } = useUserPresets();
  const { stablePartySizes } = partySizes;
  // **Active Pill** ← the slate's **Active Preset** ladder. Memoized for
  // referential stability only; the rule itself lives on `MuleBossSlate`.
  const pill = useMemo(
    () => slate.activePreset(userPresets, stablePartySizes),
    [slate, stablePartySizes, userPresets],
  );
  const slateActions = useSlateActions({
    muleId,
    partySizes: stablePartySizes,
    slate,
    userPresets,
    onUpdate,
  });

  // Cycle Clock — the Mule Actions Menu reads live Clear Mark validity to drive
  // each cadence row's wording / set-clear direction, and the beside-name
  // Completion Checks light iff their mark is valid. `now` only changes at a
  // cycle boundary, so this adds no per-keystroke work (CLAUDE.md drawer perf).
  const now = useCurrentCycle();
  const dailyValid = mule ? isMarkValid(mule, 'daily', now) : false;
  const weeklyValid = mule ? isMarkValid(mule, 'weekly', now) : false;
  const bmValid = mule ? isMarkValid(mule, 'bm', now) : false;
  // Canonical Mark-eligibility per cadence (same predicate as Mark Invalidation)
  // — an ineligible cadence hides its Mule Actions Menu row so a mark is never
  // written that would immediately invalidate. Derived straight off the slate's
  // cadence key counts, so it costs nothing per keystroke.
  const dailyEligible = isMarkEligible(slate, 'daily');
  const weeklyEligible = isMarkEligible(slate, 'weekly');
  const bmEligible = isMarkEligible(slate, 'bm');
  // The drawer's Mule Actions Menu writes marks and the Active Flag through the
  // same identity-stable `updateMule` (`onUpdate`) path as every other mule
  // edit — no drawer-level mark state to bust the memo barriers with. Delete
  // fires the undo-toast delete and then closes the drawer, so the user is
  // never left looking at a drawer for a mule that no longer exists. `muleId`,
  // `onDelete`, and `onClose` are all stable across keystrokes.
  const handleDelete = useCallback(() => {
    if (muleId) {
      onDelete(muleId);
      onClose();
    }
  }, [muleId, onDelete, onClose]);
  const identity = useMuleIdentityDraft(mule, onUpdate);
  const liveLevel = Number(identity.level.draft) || 0;
  // Slate Display Mode is a `useState`-backed primitive with a stable setter
  // callback, so threading it through the memoized MatrixToolbar / grids never
  // busts their memo barriers on keystrokes. See CLAUDE.md (drawer perf).
  const { mode: slateDisplayMode, setMode: setSlateDisplayMode } = useSlateDisplayMode();

  // Presets emit weekly Slate Keys; under Daily filter those would render as
  // Filtered-out Cells. Flip to All so the click has a visible effect.
  // Deps below are individual values — `matrixFilter` / `slateActions` are
  // fresh objects every render. See CLAUDE.md (drawer keystroke perf).
  const { filter: cadenceFilter, setFilter: setCadenceFilter } = matrixFilter;
  const { applyPreset, applyUserPreset } = slateActions;
  const handleApplyPreset = useCallback(
    (preset: PresetKey) => {
      if (cadenceFilter === 'Daily') setCadenceFilter('All');
      applyPreset(preset);
    },
    [cadenceFilter, setCadenceFilter, applyPreset],
  );
  const handleApplyUserPreset = useCallback(
    (presetId: string) => {
      if (cadenceFilter === 'Daily') setCadenceFilter('All');
      applyUserPreset(presetId);
    },
    [cadenceFilter, setCadenceFilter, applyUserPreset],
  );
  const handleSaveUserPreset = useCallback(
    (name: string, slateKeys: readonly string[]) => {
      createUserPreset(name, slateKeys, stablePartySizes);
    },
    [createUserPreset, stablePartySizes],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        data-mule-detail-drawer
        className="data-[side=right]:w-screen data-[side=right]:max-w-none data-[side=right]:sm:w-[640px] data-[side=right]:sm:max-w-[640px] overflow-y-auto p-0 bg-(--surface)"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <SheetTitle className="sr-only">Mule Details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit mule details and boss selection
        </SheetDescription>

        {mule && (
          <div className="relative @container/drawer">
            <div
              data-testid="drawer-header-layout"
              className="relative p-8 flex flex-col gap-5 @min-[605px]/drawer:flex-row @min-[605px]/drawer:items-center"
            >
              <div className="flex flex-col items-center gap-3 min-[425px]:flex-row min-[425px]:items-end min-[425px]:gap-5 flex-1 min-w-0">
                <CharacterAvatar
                  key={mule.id}
                  avatarUrl={mule.avatarUrl}
                  size={132}
                  figureScale={1.2}
                  alt={mule.name || 'Mule avatar'}
                  data-testid="drawer-avatar"
                />
                <div className="min-w-0 w-full text-center min-[425px]:w-auto min-[425px]:flex-1 min-[425px]:text-left">
                  {/* Read-only beside-name Completion Checks — one colored check
                      per currently-valid Clear Mark, matching the roster Lv-pill
                      treatment. Restored (#324) now the Crystal Tally's Mark
                      Toggles are retired; the Mule Actions Menu kebab is the sole
                      writer, and these keep mark state visible at a glance. */}
                  <h2 className="mt-1 font-display text-2xl/tight font-bold flex items-center justify-center gap-2 min-w-0 min-[425px]:justify-start">
                    <span className="truncate min-w-0">
                      {identity.name.draft || (
                        <span className="text-muted-foreground italic font-normal">
                          Unnamed Mule
                        </span>
                      )}
                    </span>
                    <CompletionChecks daily={dailyValid} weekly={weeklyValid} bm={bmValid} />
                  </h2>
                  <div className="mt-1 flex items-center justify-center gap-3 text-xs min-[425px]:justify-start">
                    <span className="font-sans uppercase tracking-[0.22em] text-(--accent-secondary) translate-x-0.5">
                      {mule.muleClass || 'no class'}
                    </span>
                    <span className="font-mono-nums text-(--accent-numeric)">
                      {liveLevel > 0 ? `Lv.${liveLevel}` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col items-center gap-2.5 min-[425px]:items-start">
                    <div
                      data-testid="drawer-weekly-income-row"
                      className="inline-flex items-center gap-1.5"
                    >
                      <MesoMetric
                        value={weeklyIncomeRaw}
                        label="Weekly meso"
                        className={HEADER_INCOME_CHIP_CLASS}
                        style={HEADER_INCOME_CHIP_STYLE}
                      >
                        <span className="font-sans text-[9px] uppercase tracking-[0.26em] text-muted-foreground">
                          Weekly
                        </span>
                        <span
                          data-testid="drawer-weekly-income-value"
                          className="font-mono-nums text-base"
                          style={{ color: weeklyIncomeColor }}
                        >
                          {weeklyIncome}
                        </span>
                      </MesoMetric>
                      <CapDropTooltipTrigger droppedKeys={droppedKeys} />
                    </div>
                    <MesoMetric
                      value={monthlyIncomeRaw}
                      label="Potential Black Mage monthly meso"
                      className={HEADER_INCOME_CHIP_CLASS}
                      style={HEADER_INCOME_CHIP_STYLE}
                    >
                      <span className="font-sans text-[9px] uppercase tracking-[0.26em] text-muted-foreground">
                        BM MONTHLY
                      </span>
                      <span
                        className="font-mono-nums text-base"
                        style={{
                          color:
                            monthlyIncomeRaw === 0 ? ZERO_NUMERATOR_TONE : 'var(--accent-numeric)',
                        }}
                      >
                        {monthlyIncome}
                      </span>
                    </MesoMetric>
                    {/* Active status chip — read-only (#324). The Active Toggle
                        pill kept its visual but lost its button semantics; the
                        Active Flag is now flipped only through the Mule Actions
                        Menu kebab. The fixed min-width keeps it from jittering as
                        it flips. */}
                    <div
                      data-testid="active-status-chip"
                      role="status"
                      aria-label={mule.active ? 'Active' : 'Inactive'}
                      className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-sans uppercase tracking-[0.18em]"
                      style={{
                        background: 'var(--surface-2)',
                        border: `1px solid ${mule.active ? 'var(--accent-soft, var(--border))' : 'var(--border)'}`,
                        color: mule.active
                          ? 'var(--accent-raw, var(--accent))'
                          : 'var(--muted-foreground)',
                        minWidth: 96,
                        justifyContent: 'center',
                      }}
                    >
                      {mule.active && (
                        <span
                          data-active-dot
                          aria-hidden
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--accent-raw, var(--accent))',
                          }}
                        />
                      )}
                      <span>{mule.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                data-testid="drawer-crystal-tally-slot"
                className="shrink-0 self-stretch @min-[605px]/drawer:self-end @min-[605px]/drawer:mr-6"
              >
                <CrystalTally
                  weeklyCount={slate.weeklyCount}
                  dailyCount={slate.dailyCount}
                  monthlyCount={slate.monthlyCount}
                />
              </div>

              {/* Mule Actions Menu — the Drawer's sole per-mule action surface
                  (#324). The kebab flips the Active Flag, sets/clears the three
                  Clear Marks, and deletes the mule (instant + undo toast, then
                  closes the drawer). It replaces the trash icon's slot; the
                  Active Toggle pill and the tally's Mark Toggles are retired in
                  favor of read-only status displays. Writes ride the
                  identity-stable `onUpdate`, so no memo barrier is busted. */}
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <MuleActionsMenu
                  mule={mule}
                  updateMule={onUpdate}
                  onDelete={handleDelete}
                  dailyValid={dailyValid}
                  weeklyValid={weeklyValid}
                  bmValid={bmValid}
                  dailyEligible={dailyEligible}
                  weeklyEligible={weeklyEligible}
                  bmEligible={bmEligible}
                />
              </div>
            </div>

            <div className="mx-6 border-t border-border/50" />

            <div className="p-6 flex flex-col gap-5 max-sm:pb-7">
              <div className="flex flex-col gap-3">
                <MuleIdentityFields mule={mule} identity={identity} onUpdate={onUpdate} />
                <MuleNotesField mule={mule} onUpdate={onUpdate} />
              </div>

              <div>
                <MatrixToolbar
                  filter={matrixFilter.filter}
                  onFilterChange={matrixFilter.setFilter}
                  activePill={pill.activePreset}
                  onApplyPreset={handleApplyPreset}
                  onReset={slateActions.resetBosses}
                  userPresets={userPresets}
                  slateKeys={selectedBosses}
                  matchedUserPreset={pill.matchedUserPreset}
                  onSaveUserPreset={handleSaveUserPreset}
                  onDeleteUserPreset={deleteUserPreset}
                  onApplyUserPreset={handleApplyUserPreset}
                  slateDisplayMode={slateDisplayMode}
                  onSelectSlateDisplayMode={setSlateDisplayMode}
                />
                <div className="mt-2">
                  <BossSearch fused value={matrixFilter.search} onChange={matrixFilter.setSearch} />
                  {/* Search + cadence filter can narrow the shared projection to
                      nothing; both Slate Display Modes then collapse to the one
                      fused empty panel instead of a bare header / blank grid. */}
                  {matrixFilter.visibleBosses.length === 0 ? (
                    <BossSlateEmpty />
                  ) : slateDisplayMode === 'cards' ? (
                    <BossCardView
                      families={matrixFilter.visibleBosses}
                      onToggleKey={slateActions.toggleKey}
                      partySizes={partySizes.stablePartySizes}
                      onChangePartySize={partySizes.setPartySize}
                      activeCadence={matrixFilter.activeCadence}
                    />
                  ) : (
                    <BossMatrix
                      families={matrixFilter.visibleBosses}
                      fusedTop
                      onToggleKey={slateActions.toggleKey}
                      partySizes={partySizes.stablePartySizes}
                      onChangePartySize={partySizes.setPartySize}
                      activeCadence={matrixFilter.activeCadence}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="sm:hidden sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 px-6">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-10 rounded-full bg-(--surface) dark:bg-(--surface) shadow-lg"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
