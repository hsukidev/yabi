import { createFileRoute } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useEffect } from 'react';
import { releases, type Release } from '../data/changelog';

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

function ChangelogPage() {
  useEffect(() => {
    document.title = 'Changelog — YABI';
  }, []);

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
  return (
    <article
      className="rounded-2xl p-6"
      style={{
        background: 'var(--surface, var(--card))',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 text-sm"
        style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} aria-hidden="true" />
          <time dateTime={release.date}>{formatReleaseDate(release.date)}</time>
        </div>
        <code className="rounded-full px-2 py-0.5 text-xs font-mono">v{release.version}</code>
      </div>
      <ul className="mt-4 list-disc pl-5 flex flex-col gap-2">
        {release.changes.map((change, idx) => (
          <li key={idx} style={{ color: 'var(--text, var(--foreground))' }}>
            {change}
          </li>
        ))}
      </ul>
    </article>
  );
}
