import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

interface CommittedDraftConfig {
  /** Id of the entity the draft belongs to (`null` = nothing open). */
  entityId: string | null;
  /** The committed upstream value the draft rebases from. */
  source: string;
  /**
   * Diff-and-write. Called with the entity id, the draft to commit, and
   * the source that draft was edited against; owns equality/normalization
   * (trim, clamp, …) so a no-op draft can be skipped by the adapter.
   * Diff against the `source` PARAMETER, not the hook's `source` prop: on
   * an entity switch the flush passes the OUTGOING entity's source, while
   * the prop has already rebased to the incoming one. (Closure-captured
   * upstream writers like `onUpdate` are safe — the callback is
   * re-captured every render.)
   */
  commit: (id: string, draft: string, source: string) => void;
}

/**
 * Owns the Drawer's draft-field editing lifecycle in one place. Per-field
 * hooks (`useMuleIdentityDraft`, `useMuleNotesDraft`) are adapters that
 * supply parse/normalize rules; everything subtle lives here:
 *
 *  - Draft Source Resync: when `source` changes externally, rebase the
 *    local draft using React's "store info from previous renders"
 *    render-time setState pattern.
 *  - Commit On Exit: flush an unblurred draft on entity switch
 *    (`entityId` changes) and on unmount. Initial mount is suppressed.
 *  - Snapshot-before-rebase: each render captures its draft in a ref so
 *    the flush effect can read the OUTGOING entity's draft even though
 *    the Draft Source Resync has already rebased state to the incoming
 *    entity.
 */
export function useCommittedDraft({ entityId, source, commit }: CommittedDraftConfig): {
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  /** Commit the current draft under the current entity id (blur path). Stable identity. */
  commitNow: () => void;
} {
  const [draft, setDraft] = useState<string>(source);

  // Snapshot-before-rebase: capture this render's draft AND source under
  // the CURRENT entityId, BEFORE the Draft Source Resync block (below)
  // potentially rebases the draft to the incoming entity's source. This
  // must run during render — it cannot move into effect cleanup, because
  // cleanup fires AFTER the calling component has already rebased the
  // props and our resync has already overwritten the draft. By that point
  // the outgoing entity's unblurred edits are gone. The source is
  // snapshotted too so the switch flush diffs the outgoing draft against
  // the OUTGOING source — diffing against the freshly-rebased prop would
  // silently drop an edit that happens to equal the incoming source.
  const prevForEntityRef = useRef<{ draft: string; source: string }>({ draft, source });
  const entityIdRef = useRef<string | null>(entityId);
  const entitySwitched = entityIdRef.current !== entityId;
  if (!entitySwitched) {
    prevForEntityRef.current = { draft, source };
  }

  // Draft Source Resync — render-time setState.
  const [lastSource, setLastSource] = useState<string>(source);
  if (lastSource !== source) {
    setLastSource(source);
    if (draft !== source) setDraft(source);
  }

  // Latest-closure ref for the commit callback. Read by the entity-switch
  // flush, the unmount cleanup, AND `commitNow` — so they all share the
  // adapter's diff/normalize semantics and always see the freshest
  // `source` + upstream-writer identities.
  const commitRef = useRef<(id: string, d: string, s: string) => void>(() => {});
  commitRef.current = commit;

  // Entity-switch flush. Depends only on entityId — adding `draft` to the
  // deps would re-run the effect on every keystroke, advance entityIdRef
  // on each render, and leave the next true switch with nothing to flush.
  // The render-time snapshot above is what makes this single-dep effect
  // safe; this disable protects that pattern.
  useEffect(() => {
    const prevId = entityIdRef.current;
    if (prevId !== null && prevId !== entityId) {
      const prev = prevForEntityRef.current;
      commitRef.current(prevId, prev.draft, prev.source);
    }
    prevForEntityRef.current = { draft, source };
    entityIdRef.current = entityId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  // Unmount flush (Drawer Close).
  useEffect(() => {
    return () => {
      const id = entityIdRef.current;
      if (id !== null) {
        const prev = prevForEntityRef.current;
        commitRef.current(id, prev.draft, prev.source);
      }
    };
  }, []);

  // Blur path. Reads the render-time snapshot so its identity can stay
  // stable; the snapshot always holds the current draft for the current
  // entity (it only lags across an entity switch, where blur cannot fire).
  const commitNow = useCallback(() => {
    const id = entityIdRef.current;
    if (id === null) return;
    const prev = prevForEntityRef.current;
    commitRef.current(id, prev.draft, prev.source);
  }, []);

  return { draft, setDraft, commitNow };
}
