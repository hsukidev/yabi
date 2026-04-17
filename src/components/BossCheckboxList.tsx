import { useState } from 'react';
import { Search, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toggleBoss, getFamilies } from '../data/bossSelection';
import { useFormatPreference } from '../modules/income-hooks';

interface BossCheckboxListProps {
  selectedBosses: string[];
  onChange: (selectedBosses: string[]) => void;
}

export function BossCheckboxList({ selectedBosses, onChange }: BossCheckboxListProps) {
  const [search, setSearch] = useState('');
  const { abbreviated } = useFormatPreference();

  const families = getFamilies(selectedBosses, search, { abbreviated });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent-secondary)]"
          aria-hidden
        />
        <Input
          placeholder="Search bosses..."
          className="pl-9 bg-input/40 border-border/60 focus-visible:border-[var(--accent-primary)] focus-visible:ring-[var(--ring)]"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        {families.map((family) => {
          const familyHasSelection = family.bosses.some((b) => b.selected);
          return (
            <div
              key={family.family}
              className="rounded-lg border border-border/50 bg-background/30 pl-3 pr-2 py-2"
              style={{
                boxShadow: familyHasSelection
                  ? 'inset 2px 0 0 0 var(--accent-primary)'
                  : 'inset 2px 0 0 0 color-mix(in oklch, var(--accent-secondary) 35%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-display text-sm font-semibold">
                  {family.displayName}
                </p>
                {familyHasSelection && (
                  <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                    claimed
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {family.bosses.map((boss) => {
                  const checkboxId = `boss-${boss.id}`;
                  const isLocked = familyHasSelection && !boss.selected;
                  return (
                    <Label
                      key={boss.id}
                      htmlFor={checkboxId}
                      className={[
                        'flex items-center gap-3 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
                        boss.selected
                          ? 'bg-[color-mix(in_oklch,var(--accent-primary)_10%,transparent)]'
                          : isLocked
                            ? 'opacity-55 hover:opacity-75'
                            : 'hover:bg-muted/40',
                      ].join(' ')}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={boss.selected}
                        onCheckedChange={() => onChange(toggleBoss(selectedBosses, boss.id))}
                      />
                      <span className="flex-1 font-sans text-sm truncate">
                        {boss.name}
                      </span>
                      {isLocked && (
                        <Lock
                          aria-hidden
                          className="h-3 w-3 text-muted-foreground/60"
                        />
                      )}
                      <span
                        className={[
                          'font-mono-nums text-xs tabular-nums',
                          boss.selected ? 'text-[var(--accent-numeric)]' : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {boss.formattedValue}
                      </span>
                    </Label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {families.length === 0 && (
          <p className="font-display italic text-sm text-muted-foreground text-center py-6">
            No bosses match that search.
          </p>
        )}
      </div>
    </div>
  );
}
