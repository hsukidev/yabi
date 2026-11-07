import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ONBOARDING_STEPS, introRecessedCardStyle } from '../hooks/useOnboarding';

export interface EmptyRosterIntroProps {
  onBegin: () => void;
}

export function EmptyRosterIntro({ onBegin }: EmptyRosterIntroProps) {
  return (
    <section
      data-testid="empty-roster-intro"
      aria-labelledby="yabi-intro-heading"
      className="panel panel-glow p-6 sm:p-8"
    >
      <div className="eyebrow">
        <span className="dot" aria-hidden="true" />
        MAPLESTORY BOSS CRYSTAL &amp; MULE INCOME TRACKER
      </div>
      <h1
        id="yabi-intro-heading"
        className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight"
        style={{ color: 'var(--text, var(--foreground))' }}
      >
        YABI — Yet Another MapleStory Income Tracker
      </h1>
      <p
        className="mt-2.5 text-sm/relaxed max-w-2xl"
        style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
      >
        MapleStory&apos;s{' '}
        <em style={{ color: 'var(--text, var(--foreground))', fontStyle: 'normal' }}>
          <strong>Y</strong>et <strong>A</strong>nother <strong>B</strong>oss <strong>I</strong>
          ncome
        </em>{' '}
        tracker. Plan weekly boss crystal clears across your mule roster for Heroic and Interactive
        worlds, compare character share percentages, and automatically enforce the 180 per-world
        crystal cap.
      </p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {ONBOARDING_STEPS.map((item) => (
          <div key={item.step} style={introRecessedCardStyle}>
            <div className="eyebrow-plain">{item.step}</div>
            <div
              className="mt-1.5 text-sm font-semibold"
              style={{ color: 'var(--text, var(--foreground))' }}
            >
              {item.title}
            </div>
            <p
              className="mt-1 text-xs/relaxed"
              style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
            >
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-5 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 70%, transparent)' }}
      >
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <ShieldCheck
            size={16}
            className="mt-0.5 sm:mt-0 shrink-0"
            style={{ color: 'var(--accent-raw, var(--accent))' }}
            aria-hidden="true"
          />
          <p
            className="text-xs/relaxed"
            style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
          >
            Your roster is saved locally in your browser&apos;s{' '}
            <span className="font-mono">localStorage</span> — nothing leaves your device except
            optional Nexon Ranking character lookups.
          </p>
        </div>

        <button
          type="button"
          data-testid="onboarding-begin-button"
          onClick={onBegin}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 cursor-pointer shrink-0"
          style={{
            background: 'var(--accent-raw, var(--accent))',
            color: 'var(--primary-foreground)',
            border: '1px solid transparent',
            boxShadow: '0 8px 24px -8px var(--accent-glow)',
          }}
        >
          <span>Begin</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
