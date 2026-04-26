import { useState, useMemo, useRef, useEffect, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  id?: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ClassAutocomplete({ id, value, options, onSelect, placeholder, className }: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  // Set when Tab commits a highlighted option so the blur handler (which sees
  // pre-commit `draft` via closure) doesn't revert it.
  const justCommittedRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const filtered = useMemo(
    () => (draft ? options.filter((o) => o.toLowerCase().includes(draft.toLowerCase())) : options),
    [draft, options],
  );

  // Clamp the highlight when `filtered` shrinks below it. Adjusting state
  // during render is the React-blessed alternative to an effect here — it
  // re-renders without a commit, avoiding the cascading-render warning.
  if (open && highlightedIndex >= filtered.length) {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  function handleSelect(option: string) {
    setDraft(option);
    setOpen(false);
    setHighlightedIndex(-1);
    onSelect(option);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
        return;
      }
      if (filtered.length === 0) return;
      setHighlightedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(filtered.length > 0 ? filtered.length - 1 : -1);
        return;
      }
      if (filtered.length === 0) return;
      setHighlightedIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Tab') {
      if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        // Commit the highlighted option but don't preventDefault — let the
        // browser move focus to the next field.
        justCommittedRef.current = true;
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        className={`text-ellipsis ${className ?? ''}`}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-activedescendant={
          open && highlightedIndex >= 0 && id ? `${id}-option-${highlightedIndex}` : undefined
        }
        onChange={(e) => {
          setDraft(e.currentTarget.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false);
          setHighlightedIndex(-1);
          if (justCommittedRef.current) {
            justCommittedRef.current = false;
            return;
          }
          if (draft === '') {
            onSelect('');
          } else {
            const match = options.find((o) => o.toLowerCase() === draft.toLowerCase());
            if (match) {
              setDraft(match);
              if (match !== value) onSelect(match);
            } else {
              setDraft(value);
            }
          }
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/60 bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden"
        >
          {filtered.map((o, idx) => (
            <li
              key={o}
              id={id ? `${id}-option-${idx}` : undefined}
              role="option"
              aria-selected={idx === highlightedIndex}
              onClick={() => handleSelect(o)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                idx === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
