import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Mule } from '../types';
import { useMuleIncome } from '../modules/income-hooks';
import { BossMatrix } from './BossMatrix';
import { BossSearch } from './BossSearch';
import { MatrixToolbar, type CadenceFilter, type PresetKey } from './MatrixToolbar';
import type { Boss } from '../types';
import {
  bossesByTopCrystalDesc,
  countWeeklySelections,
  filterBySearch,
  parseKey,
  toggleBoss,
} from '../data/bossSelection';
import {
  PRESET_FAMILIES,
  applyPreset,
  isPresetActive,
  removePreset,
} from '../data/bossPresets';
import blankCharacterPng from '../assets/blank-character.png';
import { sanitizeMuleName } from '../utils/muleName';

const PRESET_KEYS: readonly PresetKey[] = ['CRA', 'LOMIEN', 'CTENE'];

function filterByCadence(
  list: readonly Boss[],
  filter: CadenceFilter,
): readonly Boss[] {
  if (filter === 'All') return list;
  const cadence = filter === 'Weekly' ? 'weekly' : 'daily';
  return list.filter((b) => b.difficulty.some((d) => d.cadence === cadence));
}

interface MuleDetailDrawerProps {
  mule: Mule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export function MuleDetailDrawer({ mule, open, onClose, onUpdate, onDelete }: MuleDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CadenceFilter>('All');
  const { formatted: potentialIncome } = useMuleIncome(mule ?? { selectedBosses: [] });

  // Drafts decouple typing from parent state; commit to parent on blur, on
  // mule-switch, or on drawer close. Without this, per-keystroke setMules
  // fanned out through useDeferredValue's low-priority follow-up render and
  // re-rendered the pie chart's N slices — typing felt laggier as the roster
  // grew.
  const [draftName, setDraftName] = useState(mule?.name ?? '');
  const [draftClass, setDraftClass] = useState(mule?.muleClass ?? '');
  const [draftLevel, setDraftLevel] = useState(mule?.level ? String(mule.level) : '');

  const draftsRef = useRef({ name: draftName, muleClass: draftClass, level: draftLevel });
  draftsRef.current = { name: draftName, muleClass: draftClass, level: draftLevel };
  const lastMuleIdRef = useRef<string | null>(mule?.id ?? null);
  // onUpdate via ref so the mule-switch effect can depend on `mule?.id` only
  // and still call the latest callback.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    setConfirmDelete(false);
    setSearch('');
    setFilter('All');

    const prevId = lastMuleIdRef.current;
    const nextId = mule?.id ?? null;
    // Flush prior drafts to the previous mule on switch or close (nextId
    // null). Clicking another card, pressing Esc, and backdrop click all
    // route through here because `selectedMule` derives from mule id.
    if (prevId && prevId !== nextId) {
      const { name, muleClass, level } = draftsRef.current;
      onUpdateRef.current(prevId, { name, muleClass, level: Number(level) || 0 });
    }
    setDraftName(mule?.name ?? '');
    setDraftClass(mule?.muleClass ?? '');
    setDraftLevel(mule?.level ? String(mule.level) : '');
    lastMuleIdRef.current = nextId;
  }, [mule?.id]);

  const commitName = useCallback(() => {
    if (mule && draftName !== mule.name) onUpdate(mule.id, { name: draftName });
  }, [mule, draftName, onUpdate]);
  const commitClass = useCallback(() => {
    if (mule && draftClass !== mule.muleClass) onUpdate(mule.id, { muleClass: draftClass });
  }, [mule, draftClass, onUpdate]);
  const commitLevel = useCallback(() => {
    const n = Number(draftLevel) || 0;
    if (mule && n !== mule.level) onUpdate(mule.id, { level: n });
  }, [mule, draftLevel, onUpdate]);

  const levelDisplay = Number(draftLevel) || 0;

  const visibleBosses = useMemo(
    () =>
      filterBySearch(
        filterByCadence(bossesByTopCrystalDesc, filter),
        search,
      ),
    [filter, search],
  );

  const weeklyCount = useMemo(
    () => countWeeklySelections(mule?.selectedBosses ?? []),
    [mule?.selectedBosses],
  );

  const selectedBosses = useMemo(
    () => mule?.selectedBosses ?? [],
    [mule?.selectedBosses],
  );
  const activePresets = useMemo(() => {
    const set = new Set(PRESET_KEYS.filter((p) => isPresetActive(p, selectedBosses)));
    // LOMIEN's resolved keys are a superset of CRA's, so both would light up
    // whenever LOMIEN is fully selected. Prefer the more specific pill.
    if (set.has('LOMIEN')) set.delete('CRA');
    return set;
  }, [selectedBosses]);

  const muleId = mule?.id;
  const mulePartySizes = mule?.partySizes;
  const stablePartySizes = useMemo(
    () => mulePartySizes ?? {},
    [mulePartySizes],
  );

  const handleToggleKey = useCallback(
    (key: string) => {
      if (!muleId) return;
      const parsed = parseKey(key);
      if (!parsed) return;
      onUpdate(muleId, {
        selectedBosses: toggleBoss(
          selectedBosses,
          parsed.bossId,
          parsed.tier,
        ),
      });
    },
    [muleId, selectedBosses, onUpdate],
  );

  const handleChangePartySize = useCallback(
    (family: string, n: number) => {
      if (!muleId) return;
      // Clamp here so BossMatrix can stay a dumb view: party size is always
      // in [1, 6] by the time it hits storage.
      const clamped = Math.max(1, Math.min(6, n));
      onUpdate(muleId, {
        partySizes: {
          ...(mulePartySizes ?? {}),
          [family]: clamped,
        },
      });
    },
    [muleId, mulePartySizes, onUpdate],
  );

  function handleTogglePreset(preset: PresetKey) {
    if (!mule) return;
    const families = PRESET_FAMILIES[preset];
    let next: string[];
    if (activePresets.has(preset)) {
      // Clicking the active pill deselects it.
      next = removePreset(mule.selectedBosses, families);
    } else {
      // Swap semantics: strip every OTHER active preset's families first,
      // then apply this one. Keeps at most one preset active at a time while
      // preserving hand-picked selections outside any preset family.
      let cleared = mule.selectedBosses;
      for (const other of activePresets) {
        cleared = removePreset(cleared, PRESET_FAMILIES[other]);
      }
      next = applyPreset(cleared, families);
    }
    onUpdate(mule.id, { selectedBosses: next });
  }

  function handleClose() {
    setConfirmDelete(false);
    onClose();
  }

  function handleDelete(id: string) {
    onDelete(id);
    setConfirmDelete(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="data-[side=right]:w-screen data-[side=right]:sm:max-w-none data-[side=right]:md:w-[640px] data-[side=right]:md:max-w-[640px] overflow-y-auto p-0 bg-[var(--surface)]"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        <SheetTitle className="sr-only">Mule Details</SheetTitle>
        <SheetDescription className="sr-only">Edit mule details and boss selection</SheetDescription>

        {mule && <div className="relative">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-px h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--accent-raw, var(--accent-primary)), transparent)' }}
          />
          <div
            aria-hidden
            className="absolute -top-24 right-0 h-56 w-56 pointer-events-none blur-3xl opacity-30"
            style={{ background: 'radial-gradient(closest-side, var(--accent-raw, var(--accent-primary)), transparent)' }}
          />

          <div className="relative p-8 flex items-end gap-5">
            <img
              src={blankCharacterPng}
              alt={draftName || 'Mule avatar'}
              className="h-[132px] w-[132px] object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight truncate">
                {draftName || <span className="text-muted-foreground italic font-normal">Unnamed Mule</span>}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="font-sans uppercase tracking-[0.22em] text-[var(--accent-secondary)]">
                  {draftClass || 'no class'}
                </span>
                <span className="font-mono-nums text-[var(--accent-numeric)]">
                  {levelDisplay > 0 ? `Lv.${levelDisplay}` : 'N/A'}
                </span>
              </div>
              <div
                className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-border/60 px-3 py-1.5"
                style={{ background: 'var(--surface-2)' }}
              >
                <span className="font-sans text-[9px] uppercase tracking-[0.26em] text-muted-foreground">
                  Weekly
                </span>
                <span className="font-mono-nums text-base text-[var(--accent-numeric)]">{potentialIncome}</span>
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
                    color: mule.active
                      ? 'var(--chart-4)'
                      : 'var(--muted-foreground)',
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

            {confirmDelete ? (
              <div className="absolute top-3 right-3 flex items-center gap-2 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
                <span>Delete?</span>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(mule.id)}>
                  Yes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  <span className="sr-only">Delete</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleClose}
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
                    value={draftName}
                    maxLength={12}
                    onChange={(e) => setDraftName(sanitizeMuleName(e.currentTarget.value))}
                    onBlur={commitName}
                    className="bg-[var(--surface-2)] border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))]/60 focus-visible:ring-1 focus-visible:ring-[var(--ring)]/20 placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mule-class" className="font-sans text-xs text-muted-foreground">
                      Class
                    </Label>
                    <Input
                      id="mule-class"
                      placeholder="e.g. Bishop"
                      value={draftClass}
                      onChange={(e) => setDraftClass(e.currentTarget.value)}
                      onBlur={commitClass}
                      className="bg-[var(--surface-2)] border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))]/60 focus-visible:ring-1 focus-visible:ring-[var(--ring)]/20 placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mule-level" className="font-sans text-xs text-muted-foreground">
                      Level
                    </Label>
                    <Input
                      id="mule-level"
                      type="number"
                      placeholder="0"
                      min={0}
                      value={draftLevel}
                      onChange={(e) => setDraftLevel(e.currentTarget.value)}
                      onBlur={commitLevel}
                      className="bg-[var(--surface-2)] border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))]/60 focus-visible:ring-1 focus-visible:ring-[var(--ring)]/20 font-mono-nums placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <MatrixToolbar
                filter={filter}
                onFilterChange={setFilter}
                activePresets={activePresets}
                onTogglePreset={handleTogglePreset}
                weeklyCount={weeklyCount}
                onReset={() => onUpdate(mule.id, { selectedBosses: [] })}
              />
              <div className="mt-2">
                <BossSearch fused value={search} onChange={setSearch} />
                <BossMatrix
                  bosses={visibleBosses}
                  fusedTop
                  selectedKeys={mule.selectedBosses}
                  onToggleKey={handleToggleKey}
                  partySizes={stablePartySizes}
                  onChangePartySize={handleChangePartySize}
                />
              </div>
            </div>
          </div>
        </div>}
      </SheetContent>
    </Sheet>
  );
}
