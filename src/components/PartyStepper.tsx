const STEPPER_BTN_CLASS =
  'grid place-items-center w-5 self-stretch text-sm leading-none text-[var(--muted-raw,var(--muted-foreground))] cursor-pointer hover:bg-[var(--surface-2)] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * Party count stepper shared across Slate Display Modes (Boss Matrix rows and
 * the upcoming Boss Card). Clamps to 1..6 and stops event propagation so a
 * click never bubbles to an enclosing selection surface.
 */
export function PartyStepper({
  family,
  party,
  onChangePartySize,
}: {
  family: string;
  party: number;
  onChangePartySize: (family: string, n: number) => void;
}) {
  const atMin = party <= 1;
  const atMax = party >= 6;

  function step(delta: -1 | 1) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = party + delta;
      if (next < 1 || next > 6) return;
      onChangePartySize(family, next);
    };
  }

  return (
    <div data-testid={`party-stepper-${family}`} className="inline-flex items-center gap-1.5">
      <span className="font-mono-nums text-[10px] uppercase tracking-widest text-(--muted-raw,var(--muted-foreground)) @max-[599.99px]/drawer:hidden">
        Party
      </span>
      <div
        className="inline-flex items-stretch overflow-hidden rounded-[5px] border border-(--border)"
        style={{ background: 'var(--surface)', height: 20 }}
      >
        <button
          type="button"
          data-testid={`party-dec-${family}`}
          aria-label={`Decrease party size for ${family}`}
          disabled={atMin}
          onClick={step(-1)}
          className={STEPPER_BTN_CLASS}
        >
          −
        </button>
        <span className="grid place-items-center self-stretch px-1 font-mono-nums text-[10px] leading-none tabular-nums text-center min-w-[26px] border-x border-(--border)">
          {party}
        </span>
        <button
          type="button"
          data-testid={`party-inc-${family}`}
          aria-label={`Increase party size for ${family}`}
          disabled={atMax}
          onClick={step(1)}
          className={STEPPER_BTN_CLASS}
        >
          +
        </button>
      </div>
    </div>
  );
}
