import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toggleBoss, getFamilies, type BossDifficultyLabel } from '../data/bossSelection';
import { useFormatPreference } from '../modules/income-hooks';

const DIFF_COLOR: Record<BossDifficultyLabel, string> = {
  Extreme: '#e8533a',
  Chaos: '#c94f8f',
  Hard: '#d98a3a',
  Normal: '#8fb3d9',
  Easy: '#6fb878',
};

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
          className="pl-9 bg-input/40 border-border/60 focus-visible:border-[var(--accent-raw,var(--accent))] focus-visible:ring-[var(--ring)]"
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
              className="rounded-lg border border-border/50 pl-3 pr-2 py-2"
              style={{
                background: 'var(--surface-2)',
                boxShadow: familyHasSelection
                  ? 'inset 2px 0 0 0 var(--accent-raw, var(--accent))'
                  : 'inset 2px 0 0 0 color-mix(in srgb, var(--accent-raw, var(--accent)) 35%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-display text-sm font-semibold">
                  {family.displayName}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                {family.bosses.map((boss) => {
                  const checkboxId = `boss-${boss.id}`;
                  return (
                    <Label
                      key={boss.id}
                      htmlFor={checkboxId}
                      className={[
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-[13px]',
                        boss.selected
                          ? 'bg-[var(--accent-soft)] text-[var(--text,var(--foreground))]'
                          : 'text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--text,var(--foreground))]',
                      ].join(' ')}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={boss.selected}
                        onCheckedChange={() => onChange(toggleBoss(selectedBosses, boss.id))}
                      />
                      {boss.difficulty && (
                        <span
                          aria-hidden
                          data-difficulty-pip={boss.difficulty}
                          style={{
                            width: 4,
                            height: 14,
                            borderRadius: 2,
                            background: DIFF_COLOR[boss.difficulty],
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span className="flex-1 text-[13px] truncate">
                        {boss.name}
                      </span>
                      <span
                        className={[
                          'font-mono-nums text-[11px] tabular-nums',
                          boss.selected
                            ? 'text-[var(--accent-raw,var(--accent))] font-semibold'
                            : 'text-[var(--muted-raw,var(--muted-foreground))]',
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
