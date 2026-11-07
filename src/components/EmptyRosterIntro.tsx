const stepCardStyle: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
  background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
  boxShadow:
    'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
  padding: '14px 16px',
};

const steps = [
  {
    step: '01 · WORLD & ROSTER',
    title: 'Pick your world and add mules',
    body: 'Choose a Heroic (Kronos, Hyperion, Solis) or Interactive world below, then add your main and bossing mules with optional Nexon Ranking lookup.',
  },
  {
    step: '02 · BOSSES & PRESETS',
    title: 'Select boss crystals in one click',
    body: 'Apply CRA, Lomien, Ctene, or custom boss presets, set party sizes from solo to 6-man, and track daily, weekly, and monthly Black Mage clears.',
  },
  {
    step: '03 · WEEKLY CAP & MESO',
    title: 'Track per-world meso & 180 cap',
    body: 'See contributed weekly meso per character, automatic top-180 weekly crystal cap cuts, income share percentages, and reset completion marks.',
  },
] as const;

export function EmptyRosterIntro() {
  return (
    <section
      data-testid="empty-roster-intro"
      aria-labelledby="yabi-intro-heading"
      className="panel panel-glow mb-6 p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
    >
      <div className="eyebrow">
        <span className="dot" aria-hidden="true" />
        MAPLESTORY BOSS CRYSTAL &amp; MULE INCOME TRACKER
      </div>
      <h1
        id="yabi-intro-heading"
        className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight"
        style={{ color: 'var(--text, var(--foreground))' }}
      >
        YABI — Yet Another MapleStory Income Tracker
      </h1>
      <p
        className="mt-2 text-sm/relaxed max-w-3xl"
        style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
      >
        Free weekly boss crystal calculator and mule roster planner for MapleStory Heroic and
        Interactive worlds. Plan your weekly boss clears, compare mule share percentages, and
        automatically enforce the 180 per-world crystal limit. All roster data is saved locally in
        your browser.
      </p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((item) => (
          <div key={item.step} style={stepCardStyle}>
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
    </section>
  );
}
