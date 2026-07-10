/**
 * Shared empty treatment for the drawer's **Slate Display Mode** grids. When
 * the search + cadence filter narrow `visibleBosses` to nothing, both the Boss
 * Matrix and the Boss Card View collapse to this single muted panel instead of
 * a bare header (matrix) or a blank grid (cards) — one consistent "No bosses
 * match" state across both modes.
 *
 * Rendered fused directly below the `BossSearch` bar, so it squares its top
 * corners and drops its top border exactly like the matrix's `fusedTop`
 * wrapper — the panel reads as a continuation of the search field, keeping the
 * search box in place so the user can clear the query that emptied the grid.
 */
export function BossSlateEmpty() {
  return (
    <div
      data-testid="boss-slate-empty"
      role="status"
      className="rounded-t-none rounded-b-[10px] border-t-0 border border-(--border) bg-(--surface) px-4 py-10 text-center"
    >
      <p className="font-display text-[13px] font-medium text-(--text,var(--foreground))">
        No bosses match
      </p>
      <p className="mt-1 font-mono-nums text-[11px] text-(--muted-raw,var(--muted-foreground))">
        Try a different search or cadence filter.
      </p>
    </div>
  );
}
