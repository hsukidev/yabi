import { createFileRoute } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { ONBOARDING_STEPS, introRecessedCardStyle } from '../hooks/useOnboarding';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'About — YABI';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <div className="eyebrow">
          <span className="dot" aria-hidden="true" />
          OVERVIEW &amp; GUIDE
        </div>
        <h1
          className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ color: 'var(--text, var(--foreground))' }}
        >
          About
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
        >
          How YABI works, how your roster data is stored, and project credits
        </p>
      </header>

      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <article className="panel panel-glow p-6 sm:p-7">
          <div className="eyebrow">
            <span className="dot" aria-hidden="true" />
            WHAT IS YABI?
          </div>
          <h2
            className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text, var(--foreground))' }}
          >
            Yet Another MapleStory Income Tracker
          </h2>
          <p
            className="mt-2 text-sm/relaxed"
            style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
          >
            MapleStory&apos;s{' '}
            <em style={{ color: 'var(--text, var(--foreground))', fontStyle: 'normal' }}>
              <strong>Y</strong>et <strong>A</strong>nother <strong>B</strong>oss <strong>I</strong>
              ncome
            </em>{' '}
            tracker. With a simplified user experience for both desktop and mobile, players can
            build a character roster, assign weekly boss crystals, and track per-world weekly meso
            totals across Heroic and Interactive worlds.
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

          <div className="mt-3 flex items-start gap-3" style={introRecessedCardStyle}>
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0"
              style={{ color: 'var(--accent-raw, var(--accent))' }}
              aria-hidden="true"
            />
            <div>
              <div className="eyebrow-plain">LOCAL-FIRST PRIVACY</div>
              <p
                className="mt-1 text-xs/relaxed"
                style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
              >
                Your roster data is stored in the browser&apos;s{' '}
                <span className="font-mono">localStorage</span> — nothing leaves your machine except
                optional character lookups, which are fetched from Nexon&apos;s public Ranking API.
              </p>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <section className="panel panel-glow p-6">
            <div className="eyebrow">
              <span className="dot" aria-hidden="true" />
              CREDITS
            </div>
            <h2
              className="mt-2 font-display text-base font-semibold tracking-tight"
              style={{ color: 'var(--text, var(--foreground))' }}
            >
              Fan-Made Community Tool
            </h2>
            <p
              className="mt-2 text-xs/relaxed"
              style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
            >
              <em>YABI</em> is an unofficial fan-made tool for MapleStory players. MapleStory and
              its related assets are owned by Nexon Korea Corp.; YABI is not affiliated with,
              sponsored by, or endorsed by Nexon.
            </p>
          </section>

          <section className="panel panel-glow p-6">
            <div className="eyebrow">
              <span className="dot" aria-hidden="true" />
              CONTACT
            </div>
            <h2
              className="mt-2 font-display text-base font-semibold tracking-tight"
              style={{ color: 'var(--text, var(--foreground))' }}
            >
              Questions or Feedback?
            </h2>
            <p
              className="mt-2 text-xs/relaxed"
              style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
            >
              Have a suggestion or found a bug? Open an issue on{' '}
              <a
                href="https://github.com/hsukidev/yabi/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
              >
                GitHub Issues
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
