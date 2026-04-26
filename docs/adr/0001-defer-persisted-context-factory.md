# Defer the persisted-context factory for World / Theme / Density providers

The three context providers (`WorldProvider`, `ThemeProvider`, `DensityProvider`) share a localStorage + lazy-init + write-effect skeleton, and a factory that abstracts it has been considered. We are deliberately not building it: the asymmetries between the providers (system-preference fallback in Theme, `findWorld`-based public/stored split in World, DOM transition-suppression rAF in Theme, toggle-sugar in two of three) mean the factory's option surface ends up nearly as wide as what it abstracts — the deletion test points the wrong direction. A future fourth persisted context, or a real change to the storage strategy (e.g. cross-tab `BroadcastChannel`, a `sessionStorage` fallback ladder matching `Mule Store`), would reverse this decision.

## Considered Options

- **Build a `createPersistedContext<TStored, TPublic>` factory now.** Net ~25 LOC saved, distributed across an abstraction whose interface (~6 options) is roughly as complex as its implementation.
- **Defer (chosen).** Keep the three providers parallel-but-independent until the friction is real — i.e. a fourth persisted context lands, or the storage protocol needs to change in one place.
