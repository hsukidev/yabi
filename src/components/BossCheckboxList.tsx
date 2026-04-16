import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toggleBoss, getFamilies } from '../data/bossSelection';

interface BossCheckboxListProps {
  selectedBosses: string[];
  onChange: (selectedBosses: string[]) => void;
  abbreviated?: boolean;
}

export function BossCheckboxList({ selectedBosses, onChange, abbreviated = true }: BossCheckboxListProps) {
  const [search, setSearch] = useState('');

  const families = getFamilies(selectedBosses, search, { abbreviated });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bosses..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </div>
      {families.map((family) => (
        <div
          key={family.family}
          className="border rounded-md px-2 py-1"
        >
          <p className="text-sm font-semibold mb-1">
            {family.displayName}
          </p>
          <div className="flex gap-1 flex-wrap">
            {family.bosses.map((boss) => {
              const checkboxId = `boss-${boss.id}`;
              return (
                <div key={boss.id} className="flex items-center gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={boss.selected}
                    onCheckedChange={() => onChange(toggleBoss(selectedBosses, boss.id))}
                  />
                  <Label htmlFor={checkboxId}>{boss.name} ({boss.formattedValue})</Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {families.length === 0 && (
        <p className="text-muted-foreground text-center">No bosses found</p>
      )}
    </div>
  );
}
