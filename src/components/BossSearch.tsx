import { memo } from 'react';
import { Search } from 'lucide-react';

interface BossSearchProps {
  value: string;
  onChange: (next: string) => void;
  /** When true, adds `.d-search-fused` so the bar visually fuses to an element below. */
  fused?: boolean;
  placeholder?: string;
}

export const BossSearch = memo(function BossSearch({
  value,
  onChange,
  fused = false,
  placeholder = 'Search bosses\u2026',
}: BossSearchProps) {
  const className = fused ? 'd-search d-search-fused' : 'd-search';
  return (
    <div className={className}>
      <Search size={13} aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        aria-label="Search bosses"
      />
    </div>
  );
});
