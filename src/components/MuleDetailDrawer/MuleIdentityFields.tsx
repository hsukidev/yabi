import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Mule } from '../../types';
import { ClassAutocomplete } from '../ClassAutocomplete';
import { GMS_CLASSES } from '../../constants/classes';
import { MULE_NAME_MAX_LENGTH } from '../../utils/muleName';
import type { useMuleIdentityDraft } from './hooks/useMuleIdentityDraft';
import { CharacterLookupButton } from './CharacterLookupButton';
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from './fieldStyles';

interface Props {
  mule: Mule;
  identity: ReturnType<typeof useMuleIdentityDraft>;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
}

/**
 * Renders the identity Draft Field inputs. The drawer owns the
 * `useMuleIdentityDraft` hook so the header can read draft values live.
 */
export function MuleIdentityFields({ mule, identity, onUpdate }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="mule-name" className={FIELD_LABEL_CLASS}>
          Character Name
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="mule-name"
            placeholder="Enter name"
            value={identity.name.draft}
            maxLength={MULE_NAME_MAX_LENGTH}
            onChange={identity.name.onChange}
            onBlur={identity.name.onBlur}
            className={`${FIELD_INPUT_CLASS} flex-1`}
          />
          <CharacterLookupButton mule={mule} draftName={identity.name.draft} onUpdate={onUpdate} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mule-class" className={FIELD_LABEL_CLASS}>
            Class
          </Label>
          <ClassAutocomplete
            key={mule.id}
            id="mule-class"
            placeholder="e.g. Bishop"
            value={mule.muleClass ?? ''}
            options={GMS_CLASSES}
            onSelect={(c) => onUpdate(mule.id, { muleClass: c })}
            className={FIELD_INPUT_CLASS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mule-level" className={FIELD_LABEL_CLASS}>
              Level
            </Label>
            <Input
              id="mule-level"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={identity.level.draft}
              onChange={identity.level.onChange}
              onBlur={identity.level.onBlur}
              className={`${FIELD_INPUT_CLASS} font-mono-nums`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mule-cp" className={FIELD_LABEL_CLASS}>
              CP
            </Label>
            <Input
              id="mule-cp"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={identity.combatPower.draft}
              onChange={identity.combatPower.onChange}
              onBlur={identity.combatPower.onBlur}
              className={`${FIELD_INPUT_CLASS} font-mono-nums`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
