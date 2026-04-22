import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Mule } from '../types';
import { useIncome } from '../modules/income';
import { BossMatrix } from './BossMatrix';
import { BossSearch } from './BossSearch';
import { MatrixToolbar } from './MatrixToolbar';
import blankCharacterPng from '../assets/blank-character.png';
import { ClassAutocomplete } from './ClassAutocomplete';
import { GMS_CLASSES } from '../constants/classes';
import { useMuleIdentityDraft } from './MuleDetailDrawer/hooks/useMuleIdentityDraft';
import { useBossMatrixView } from './MuleDetailDrawer/hooks/useBossMatrixView';
import { useDeleteConfirm } from './MuleDetailDrawer/hooks/useDeleteConfirm';
import { CrystalTally } from './MuleDetailDrawer/CrystalTally';

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
  // show potential income regardless of active state.
  const { formatted: potentialIncome } = useIncome({ selectedBosses: mule?.selectedBosses ?? [] });

  const identity = useMuleIdentityDraft(mule, onUpdate);
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
        className="data-[side=right]:w-screen data-[side=right]:sm:max-w-none data-[side=right]:md:w-[640px] data-[side=right]:md:max-w-[640px] overflow-y-auto p-0 bg-(--surface)"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <SheetTitle className="sr-only">Mule Details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit mule details and boss selection
        </SheetDescription>

        {mule && (
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-x-0 -top-px h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--accent-raw, var(--accent-primary)), transparent)',
              }}
            />
            <div
              aria-hidden
              className="absolute -top-24 right-0 size-56  pointer-events-none blur-3xl opacity-30"
              style={{
                background:
                  'radial-gradient(closest-side, var(--accent-raw, var(--accent-primary)), transparent)',
              }}
            />

            <div className="relative p-8 flex items-end gap-5">
              <img
                src={blankCharacterPng}
                alt={identity.name.draft || 'Mule avatar'}
                className="size-[132px]  object-contain shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="mt-1 font-display text-2xl/tight font-bold  truncate">
                  {identity.name.draft || (
                    <span className="text-muted-foreground italic font-normal">Unnamed Mule</span>
                  )}
                </h2>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span className="font-sans uppercase tracking-[0.22em] text-(--accent-secondary)">
                    {mule.muleClass || 'no class'}
                  </span>
                  <span className="font-mono-nums text-(--accent-numeric)">
                    {identity.level.displayNumber > 0
                      ? `Lv.${identity.level.displayNumber}`
                      : 'N/A'}
                  </span>
                </div>
                <div
                  className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-border/60 px-3 py-1.5"
                  style={{ background: 'var(--surface-2)' }}
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
                      background: 'var(--surface-2)',
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

              <div className="shrink-0 self-end">
                <CrystalTally weeklyCount={matrix.weeklyCount} dailyCount={matrix.dailyCount} />
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={onClose}
                  >
                    <X />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="mx-6 border-t border-border/50" />

            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mule-name" className="font-sans text-xs text-muted-foreground">
                      Character Name
                    </Label>
                    <Input
                      id="mule-name"
                      placeholder="Enter name"
                      value={identity.name.draft}
                      maxLength={12}
                      onChange={identity.name.onChange}
                      onBlur={identity.name.onBlur}
                      className="bg-(--surface-2) border-border/60 focus-visible:border-(--accent-raw,var(--accent))/60 focus-visible:ring-1 focus-visible:ring-(--ring)/20 placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="mule-class"
                        className="font-sans text-xs text-muted-foreground"
                      >
                        Class
                      </Label>
                      <ClassAutocomplete
                        key={mule.id}
                        id="mule-class"
                        placeholder="e.g. Bishop"
                        value={mule.muleClass ?? ''}
                        options={GMS_CLASSES}
                        onSelect={(c) => onUpdate(mule.id, { muleClass: c })}
                        className="bg-(--surface-2) border-border/60 focus-visible:border-(--accent-raw,var(--accent))/60 focus-visible:ring-1 focus-visible:ring-(--ring)/20 placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="mule-level"
                        className="font-sans text-xs text-muted-foreground"
                      >
                        Level
                      </Label>
                      <Input
                        id="mule-level"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={identity.level.draft}
                        onChange={identity.level.onChange}
                        onBlur={identity.level.onBlur}
                        className="bg-(--surface-2) border-border/60 focus-visible:border-(--accent-raw,var(--accent))/60 focus-visible:ring-1 focus-visible:ring-(--ring)/20 font-mono-nums placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                      />
                    </div>
                  </div>
                </div>
              </div>

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
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
