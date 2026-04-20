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
import { useIncome } from '../modules/income';
import { BossMatrix } from './BossMatrix';
import { BossSearch } from './BossSearch';
import { MatrixToolbar, type CadenceFilter, type PresetKey } from './MatrixToolbar';
import { MuleBossSlate, type SlateFamily } from '../data/muleBossSlate';
import {
  PRESET_FAMILIES,
  applyPreset,
  isPresetActive,
  removePreset,
} from '../data/bossPresets';
import blankCharacterPng from '../assets/blank-character.png';
import { sanitizeMuleName } from '../utils/muleName';
import { ClassAutocomplete } from './ClassAutocomplete';
import { GMS_CLASSES } from '../constants/classes';

const PRESET_KEYS: readonly PresetKey[] = ['CRA', 'LOMIEN', 'CTENE'];

/**
 * Narrow `SlateFamily[]` to families whose rows include at least one row with
 * the requested cadence. Applied post-`slate.view(search)` so the cadence
 * filter composes with the search filter without reshaping slate internals.
 */
function filterFamiliesByCadence(
  families: SlateFamily[],
  filter: CadenceFilter,
): SlateFamily[] {
  if (filter === 'All') return families;
  const cadence = filter === 'Weekly' ? 'weekly' : 'daily';
  return families.filter((f) => f.rows.some((r) => r.cadence === cadence));
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
  // Strip `active` so the Active-Flag Filter doesn't zero the pill when the
  // drawer opens on an inactive mule — the drawer is the editor and needs to
  // show potential income regardless of active state.
  const { formatted: potentialIncome } = useIncome({ selectedBosses: mule?.selectedBosses ?? [] });

  // Drafts prevent per-keystroke setMules from re-rendering the pie chart and
  // roster cards; commits on blur/select instead.
  const [draftName, setDraftName] = useState(mule?.name ?? '');
  const [draftLevel, setDraftLevel] = useState(mule?.level ? String(mule.level) : '');

  const draftsRef = useRef({ name: draftName, level: draftLevel });
  draftsRef.current = { name: draftName, level: draftLevel };
  const lastMuleIdRef = useRef<string | null>(mule?.id ?? null);
  // Ref so the mule-switch effect depends only on mule?.id, not onUpdate.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    setConfirmDelete(false);
    setSearch('');
    setFilter('All');

    const prevId = lastMuleIdRef.current;
    const nextId = mule?.id ?? null;
    // Flush drafts on switch/close — Esc and backdrop also route here since
    // selectedMule derives from mule id.
    if (prevId && prevId !== nextId) {
      const { name, level } = draftsRef.current;
      onUpdateRef.current(prevId, { name, level: Number(level) || 0 });
    }
    setDraftName(mule?.name ?? '');
    setDraftLevel(mule?.level ? String(mule.level) : '');
    lastMuleIdRef.current = nextId;
  }, [mule?.id]);

  const commitName = useCallback(() => {
    if (mule && draftName !== mule.name) onUpdate(mule.id, { name: draftName });
  }, [mule, draftName, onUpdate]);
  const commitLevel = useCallback(() => {
    if (!mule) return;
    if (draftLevel === '') {
      if (mule.level !== 0) onUpdate(mule.id, { level: 0 });
      return;
    }
    const clamped = Math.min(300, Math.max(1, Number(draftLevel)));
    if (String(clamped) !== draftLevel) setDraftLevel(String(clamped));
    if (clamped !== mule.level) onUpdate(mule.id, { level: clamped });
  }, [mule, draftLevel, onUpdate]);

  const levelDisplay = Number(draftLevel) || 0;

  const selectedBosses = useMemo(
    () => mule?.selectedBosses ?? [],
    [mule?.selectedBosses],
  );
  const slate = useMemo(
    () => MuleBossSlate.from(selectedBosses),
    [selectedBosses],
  );
  // Search projection first, then cadence filter on the resulting family list;
  // `slate.view` already bakes each row's `selected: bool` from the slate.
  const families = useMemo(
    () => filterFamiliesByCadence(slate.view(search), filter),
    [slate, search, filter],
  );

  const weeklyCount = slate.weeklyCount;

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
      onUpdate(muleId, { selectedBosses: slate.toggle(key).keys as string[] });
    },
    [muleId, slate, onUpdate],
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
    const presetFamilies = PRESET_FAMILIES[preset];
    let next: string[];
    if (activePresets.has(preset)) {
      // Clicking the active pill deselects it.
      next = removePreset(slate.keys as string[], presetFamilies);
    } else {
      // Swap semantics: strip every OTHER active preset's families first,
      // then apply this one. Keeps at most one preset active at a time while
      // preserving hand-picked selections outside any preset family.
      let cleared = slate.keys as string[];
      for (const other of activePresets) {
        cleared = removePreset(cleared, PRESET_FAMILIES[other]);
      }
      next = applyPreset(cleared, presetFamilies);
    }
    // Normalize through construction so the Selection Invariant holds before
    // the write hits `onUpdate`.
    onUpdate(mule.id, {
      selectedBosses: MuleBossSlate.from(next).keys as string[],
    });
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
                  {mule.muleClass || 'no class'}
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
                    <ClassAutocomplete
                      key={mule.id}
                      id="mule-class"
                      placeholder="e.g. Bishop"
                      value={mule.muleClass ?? ''}
                      options={GMS_CLASSES}
                      onSelect={(c) => onUpdate(mule.id, { muleClass: c })}
                      className="bg-[var(--surface-2)] border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))]/60 focus-visible:ring-1 focus-visible:ring-[var(--ring)]/20 placeholder:opacity-60 placeholder:text-xs placeholder:italic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mule-level" className="font-sans text-xs text-muted-foreground">
                      Level
                    </Label>
                    <Input
                      id="mule-level"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={draftLevel}
                      onChange={(e) =>
                        setDraftLevel(
                          e.currentTarget.value.replace(/\D/g, '').slice(0, 3),
                        )
                      }
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
                  families={families}
                  fusedTop
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
