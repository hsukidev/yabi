import { useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Mule } from '../../types';
import { isChallengerWorld } from '../../data/worlds';
import { useCharacterLookup } from '../../hooks/useCharacterLookup';
import { toast } from '../../lib/toast';

interface Props {
  mule: Mule;
  /** Live name from the identity draft — empty string disables the button. */
  draftName: string;
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void;
}

/**
 * Lookup button rendered in the drawer's identity-fields row. Disabled
 * when:
 *
 *   - the character name (live draft) is empty
 *   - the mule has no `worldId`
 *   - the mule's world is a Challenger World (CW lookup is out of scope
 *     for slice 1; CW mules continue to be hand-edited)
 *
 * On click, the underlying `useCharacterLookup` hook drives the
 * `lookupCharacter` library. Success populates name / class / level /
 * `avatarUrl` via the existing `onUpdate` flow; failures surface a
 * toast and leave the mule data untouched.
 */
export function CharacterLookupButton({ mule, draftName, onUpdate }: Props) {
  const { loading, run } = useCharacterLookup();

  const trimmed = draftName.trim();
  const worldId = mule.worldId;
  const disabled = trimmed === '' || !worldId || isChallengerWorld(worldId) || loading;

  const onClick = useCallback(async () => {
    if (!worldId || trimmed === '') return;
    const result = await run({ name: trimmed, worldId });
    if (result.kind === 'aborted') return;

    if (result.kind === 'success') {
      onUpdate(mule.id, {
        name: result.data.name,
        level: result.data.level,
        muleClass: result.data.className,
        avatarUrl: result.data.avatarUrl,
      });
      toast.success('Character found', {
        description: `${result.data.name} · Lv.${result.data.level} ${result.data.className}`,
      });
      return;
    }

    if (result.kind === 'not-found') {
      toast.error('Character not found', {
        description:
          'The character must have been logged in within the last week to appear in the weekly ranking.',
      });
      return;
    }

    toast.error('Lookup failed', {
      description: 'Could not reach the lookup service. Please try again.',
    });
  }, [mule.id, onUpdate, run, trimmed, worldId]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid="character-lookup-button"
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
      <span>Lookup</span>
    </Button>
  );
}
