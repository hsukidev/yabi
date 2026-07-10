import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

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
      <header className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ color: 'var(--accent-primary)' }}
        >
          About
        </h1>
      </header>

      <article className="panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <section>
          <h2
            className="text-lg uppercase tracking-wide font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            What is YABI?
          </h2>
          <p className="mt-2" style={{ color: 'var(--text, var(--foreground))' }}>
            Maplestory's{' '}
            <em>
              <strong>Y</strong>et <strong>A</strong>nother <strong>B</strong>oss <strong>I</strong>
              ncome
            </em>{' '}
            tracker. With a simplified user experience for both desktop and mobile, users can build
            a roster and select bosses to display the per-world weekly meso totals.
          </p>
          <p className="mt-3" style={{ color: 'var(--text, var(--foreground))' }}>
            Your roster data is stored in the browser's localStorage — nothing leaves your machine
            except optional character lookups, which is fetched from Nexon's public Ranking API.
          </p>
        </section>

        <section className="mt-6">
          <h2
            className="text-lg uppercase tracking-wide font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            Credits
          </h2>
          <p className="mt-2" style={{ color: 'var(--text, var(--foreground))' }}>
            <em>YABI</em> is an unofficial fan-made tool for MapleStory players. MapleStory and its
            related assets are owned by Nexon Korea Corp.; YABI is not affiliated with, sponsored
            by, or endorsed by Nexon.
          </p>
        </section>

        <section className="mt-6">
          <h2
            className="text-lg uppercase tracking-wide font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            Contact
          </h2>
          <p className="mt-2" style={{ color: 'var(--text, var(--foreground))' }}>
            Questions or feedback?{' '}
            <a
              href="mailto:hsukidev@gmail.com"
              style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
            >
              hsukidev@gmail.com
            </a>{' '}
            or find me on{' '}
            <a
              href="https://www.reddit.com/user/hsukidev/"
              style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
            >
              reddit
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
