import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Mule } from '../types';
import { MuleCharacterCard } from './MuleCharacterCard';

interface SortableMuleCharacterCardProps {
  mule: Mule;
  onClick: () => void;
}

export function SortableMuleCharacterCard({ mule, onClick }: SortableMuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mule.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MuleCharacterCard mule={mule} onClick={onClick} />
    </div>
  );
}