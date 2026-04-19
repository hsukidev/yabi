import { useState, useEffect } from 'react';
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
import { parseKey, toggleBoss } from '../data/bossSelection';
import placeholderPng from '../assets/placeholder.png';

interface MuleDetailDrawerProps {
  mule: Mule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export function MuleDetailDrawer({ mule, open, onClose, onUpdate, onDelete }: MuleDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { formatted: potentialIncome } = useMuleIncome(mule ?? { selectedBosses: [] });

  useEffect(() => { setConfirmDelete(false); }, [mule?.id]);

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
        className="data-[side=right]:w-screen data-[side=right]:sm:max-w-none data-[side=right]:md:w-[640px] data-[side=right]:md:max-w-[640px] overflow-y-auto p-0"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
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

          <div className="relative p-8 flex items-start gap-5 border-b border-border/50">
            <div className="relative h-[132px] w-[132px] rounded-lg overflow-hidden border border-border/60 bg-surface-raised shrink-0">
              <img
                src={placeholderPng}
                alt={mule.name || 'Mule avatar'}
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 55%, var(--card) 100%)' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight truncate">
                {mule.name || <span className="text-muted-foreground italic font-normal">Unnamed Mule</span>}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-xs">
                {mule.level > 0 && (
                  <span className="font-mono-nums text-[var(--accent-numeric)]">Lv.{mule.level}</span>
                )}
                {mule.muleClass && (
                  <span className="font-sans uppercase tracking-[0.22em] text-[10px] text-[var(--accent-secondary)]">
                    {mule.muleClass}
                  </span>
                )}
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
            </div>

            {confirmDelete ? (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1">
                <span className="font-sans text-xs text-destructive">Delete?</span>
                <Button size="xs" variant="destructive" onClick={() => handleDelete(mule.id)}>
                  Yes
                </Button>
                <Button size="xs" variant="outline" onClick={() => setConfirmDelete(false)}>
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
                    value={mule.name}
                    onChange={(e) => onUpdate(mule.id, { name: e.currentTarget.value })}
                    className="bg-input/40 border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))] focus-visible:ring-[var(--ring)]"
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
                      value={mule.muleClass}
                      onChange={(e) => onUpdate(mule.id, { muleClass: e.currentTarget.value })}
                      className="bg-input/40 border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))] focus-visible:ring-[var(--ring)]"
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
                      value={mule.level || ''}
                      onChange={(e) => onUpdate(mule.id, { level: Number(e.currentTarget.value) || 0 })}
                      className="bg-input/40 border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))] focus-visible:ring-[var(--ring)] font-mono-nums"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <BossMatrix
                selectedKeys={mule.selectedBosses}
                onToggleKey={(key) => {
                  const parsed = parseKey(key);
                  if (!parsed) return;
                  onUpdate(mule.id, {
                    selectedBosses: toggleBoss(
                      mule.selectedBosses,
                      parsed.bossId,
                      parsed.tier,
                    ),
                  });
                }}
                partySizes={mule.partySizes ?? {}}
                onChangePartySize={(family, n) => {
                  // Clamp here so BossMatrix can stay a dumb view: party size
                  // is always in [1, 6] by the time it hits storage.
                  const clamped = Math.max(1, Math.min(6, n));
                  onUpdate(mule.id, {
                    partySizes: {
                      ...(mule.partySizes ?? {}),
                      [family]: clamped,
                    },
                  });
                }}
              />
            </div>
          </div>
        </div>}
      </SheetContent>
    </Sheet>
  );
}
