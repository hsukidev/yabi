import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Mule } from '../types';
import { useIncome } from '../modules/income';
import { formatMeso } from '../utils/meso';
import { BossMatrix } from './BossMatrix';
import { BossSearch } from './BossSearch';
import { MatrixToolbar } from './MatrixToolbar';
import blankCharacterPng from '../assets/blank-character.png';
import { useBossMatrixView } from './MuleDetailDrawer/hooks/useBossMatrixView';
import { useDeleteConfirm } from './MuleDetailDrawer/hooks/useDeleteConfirm';
import { useMuleIdentityDraft } from './MuleDetailDrawer/hooks/useMuleIdentityDraft';
import { CrystalTally } from './MuleDetailDrawer/CrystalTally';
import { MuleIdentityFields } from './MuleDetailDrawer/MuleIdentityFields';

interface MuleDetailDrawerProps {
  mule: Mule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export function MuleDetailDrawer({
  mule,
  open,
  onClose,
  onUpdate,
  onDelete,
}: MuleDetailDrawerProps) {
  // Strip `active` so the Active-Flag Filter doesn't zero the pill when the
  // drawer opens on an inactive mule — the drawer is the editor and needs to
  // show potential income regardless of active state. Force abbreviation in
  // the header chip so the readout stays compact regardless of the global
  // Format Preference. The source object is memoized so per-keystroke drawer
  // re-renders (from the lifted identity draft) don't blow the income cache.
  const incomeSource = useMemo(
    () => ({ selectedBosses: mule?.selectedBosses ?? [], partySizes: mule?.partySizes }),
    [mule?.selectedBosses, mule?.partySizes],
  );
  const { raw: potentialIncomeRaw } = useIncome(incomeSource);
  const potentialIncome = formatMeso(potentialIncomeRaw, true);

  const matrix = useBossMatrixView({
    muleId: mule?.id ?? null,
    selectedBosses: mule?.selectedBosses ?? [],
    partySizes: mule?.partySizes,
    onUpdate,
  });
  const del = useDeleteConfirm({
    muleId: mule?.id ?? null,
    onDelete,
    onAfterDelete: onClose,
  });
  const identity = useMuleIdentityDraft(mule, onUpdate);
  const liveLevel = Number(identity.level.draft) || 0;

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
        className="data-[side=right]:w-screen data-[side=right]:max-w-none data-[side=right]:sm:w-[640px] data-[side=right]:sm:max-w-[640px] overflow-y-auto p-0 bg-(--surface)"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <SheetTitle className="sr-only">Mule Details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit mule details and boss selection
        </SheetDescription>

        {mule && (
          <div className="relative @container/drawer">
            <div className="relative p-8 flex flex-col gap-5 @min-[600px]/drawer:flex-row @min-[600px]/drawer:items-center">
              <div className="flex flex-col items-center gap-3 min-[425px]:flex-row min-[425px]:items-end min-[425px]:gap-5 flex-1 min-w-0">
                <img
                  src={blankCharacterPng}
                  alt={mule.name || 'Mule avatar'}
                  className="size-[132px]  object-contain shrink-0"
                />
                <div className="min-w-0 w-full text-center min-[425px]:w-auto min-[425px]:flex-1 min-[425px]:text-left">
                  <h2 className="mt-1 font-display text-2xl/tight font-bold  truncate">
                    {identity.name.draft || (
                      <span className="text-muted-foreground italic font-normal">Unnamed Mule</span>
                    )}
                  </h2>
                  <div className="mt-1 flex items-center justify-center gap-3 text-xs min-[425px]:justify-start">
                    <span className="font-sans uppercase tracking-[0.22em] text-(--accent-secondary) translate-x-0.5">
                      {mule.muleClass || 'no class'}
                    </span>
                    <span className="font-mono-nums text-(--accent-numeric)">
                      {liveLevel > 0 ? `Lv.${liveLevel}` : 'N/A'}
                    </span>
                  </div>
                  <div
                    className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-border/60 px-3 py-1.5"
                    style={{
                      background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
                      boxShadow:
                        'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
                    }}
                  >
                    <span className="font-sans text-[9px] uppercase tracking-[0.26em] text-muted-foreground">
                      Weekly
                    </span>
                    <span className="font-mono-nums text-base text-(--accent-numeric)">
                      {potentialIncome}
                    </span>
                    <span className="font-display italic text-xs text-muted-foreground">mesos</span>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      data-testid="active-toggle"
                      aria-pressed={mule.active}
                      onClick={() => onUpdate(mule.id, { active: !mule.active })}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-sans uppercase tracking-[0.18em] transition-colors"
                      style={{
                        background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
                        boxShadow:
                          'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                        color: mule.active ? 'var(--chart-4)' : 'var(--muted-foreground)',
                        minWidth: 96,
                        justifyContent: 'center',
                        cursor: 'pointer',
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
                            background: 'var(--chart-4)',
                          }}
                        />
                      )}
                      <span>{mule.active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-stretch @min-[600px]/drawer:self-end @min-[600px]/drawer:mr-6">
                <CrystalTally
                  weeklyCount={matrix.weeklyCount}
                  dailyCount={matrix.dailyCount}
                  monthlyCount={matrix.monthlyCount}
                />
              </div>

              {del.confirming ? (
                <div className="absolute top-3 right-3 flex items-center gap-2 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
                  <span>Delete?</span>
                  <Button size="sm" variant="destructive" onClick={del.confirm}>
                    Yes
                  </Button>
                  <Button size="sm" variant="outline" onClick={del.cancel}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={del.request}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="mx-6 border-t border-border/50" />

            <div className="p-6 flex flex-col gap-5">
              <MuleIdentityFields mule={mule} identity={identity} onUpdate={onUpdate} />

              <div>
                <MatrixToolbar
                  filter={matrix.filter}
                  onFilterChange={matrix.setFilter}
                  activePill={matrix.activePill}
                  onApplyPreset={matrix.applyPreset}
                  onReset={matrix.resetBosses}
                />
                <div className="mt-2">
                  <BossSearch fused value={matrix.search} onChange={matrix.setSearch} />
                  <BossMatrix
                    families={matrix.visibleBosses}
                    fusedTop
                    onToggleKey={matrix.toggleKey}
                    partySizes={matrix.stablePartySizes}
                    onChangePartySize={matrix.setPartySize}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="sm:hidden w-full h-10 rounded-[10px]"
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
