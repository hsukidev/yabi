import { createFileRoute } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useEffect } from 'react';
import {
  CATEGORY_META,
  ORDERED_CATEGORIES,
  releases,
  type Change,
  type ChangeCategory,
  type Release,
} from '../data/changelog';
import { useChangelogNotification } from '../hooks/useChangelogNotification';

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

function formatReleaseDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`));
}

function groupChanges(changes: Change[]): Record<ChangeCategory, Change[]> {
  const grouped: Record<ChangeCategory, Change[]> = { feature: [], ui: [], fix: [] };
  for (const change of changes) grouped[change.category].push(change);
  return grouped;
}

function renderChangeText(change: Change) {
  if (!change.boldText) return change.text;
  const idx = change.text.indexOf(change.boldText);
  if (idx === -1) return change.text;
  const before = change.text.slice(0, idx);
  const after = change.text.slice(idx + change.boldText.length);
  return (
    <>
      {before}
      <strong>{change.boldText}</strong>
      {after}
    </>
  );
}

function ChangelogPage() {
  const { markSeen } = useChangelogNotification();
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Changelog — YABI';
    markSeen();
    return () => {
      document.title = previousTitle;
    };
  }, [markSeen]);

  return (
    <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ color: 'var(--accent-primary)' }}
        >
          Changelog
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}>
          Stay up to date with the latest changes and improvements
        </p>
      </header>

      <ul className="flex flex-col gap-5 list-none p-0 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        {releases.map((release) => (
          <li key={release.date}>
            <ReleaseCard release={release} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function ReleaseCard({ release }: { release: Release }) {
  const grouped = groupChanges(release.changes);

  return (
    <article className="panel p-6">
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} aria-hidden="true" />
          <time dateTime={release.date}>{formatReleaseDate(release.date)}</time>
        </div>
      </div>

      {ORDERED_CATEGORIES.map((category) => {
        const items = grouped[category];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[category];
        return (
          <section key={category} className="mt-4">
            <h3
              className="text-lg uppercase tracking-wide font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              {meta.label}
            </h3>
            <ul className="mt-2 list-disc pl-5 flex flex-col gap-2">
              {items.map((item, idx) => (
                <li key={idx} style={{ color: 'var(--text, var(--foreground))' }}>
                  {renderChangeText(item)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
