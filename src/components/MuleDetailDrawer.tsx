import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { IconTrash } from '@tabler/icons-react';
import type { Mule } from '../types';
import { getMuleIncome } from '../modules/income';
import { BossCheckboxList } from './BossCheckboxList';
import placeholderPng from '../assets/placeholder.png';

interface MuleDetailDrawerProps {
  mule: Mule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
  abbreviated?: boolean;
}

export function MuleDetailDrawer({ mule, open, onClose, onUpdate, onDelete, abbreviated = true }: MuleDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleClose() {
    setConfirmDelete(false);
    onClose();
  }

  function handleDelete(id: string) {
    onDelete(id);
    setConfirmDelete(false);
    onClose();
  }

  if (!mule) return null;

  const { formatted: potentialIncome } = getMuleIncome(mule.selectedBosses, abbreviated);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <SheetContent side="right" className="w-[550px] sm:max-w-[550px] overflow-y-auto p-6">
        <SheetTitle className="sr-only">Mule Details</SheetTitle>
        <SheetDescription className="sr-only">Edit mule details and boss selection</SheetDescription>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <img
              src={placeholderPng}
              alt={mule.name || 'Mule avatar'}
              className="w-20 h-[120px] object-cover rounded"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">
                {mule.name || 'Unnamed Mule'}
              </h2>
              {mule.level > 0 && <p className="text-sm">Lv. {mule.level}</p>}
              {mule.muleClass && <p className="text-sm">{mule.muleClass}</p>}
              <p className="text-sm font-bold text-yellow-500">
                {potentialIncome}/week
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <Label htmlFor="mule-name">Character Name</Label>
              <Input
                id="mule-name"
                placeholder="Enter name"
                value={mule.name}
                onChange={(e) => onUpdate(mule.id, { name: e.currentTarget.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mule-level">Level</Label>
              <Input
                id="mule-level"
                type="number"
                placeholder="Level"
                min={0}
                value={mule.level || ''}
                onChange={(e) => onUpdate(mule.id, { level: Number(e.currentTarget.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mule-class">Class</Label>
              <Input
                id="mule-class"
                placeholder="Enter class"
                value={mule.muleClass}
                onChange={(e) => onUpdate(mule.id, { muleClass: e.currentTarget.value })}
              />
            </div>
          </div>

          <BossCheckboxList
            selectedBosses={mule.selectedBosses}
            onChange={(selectedBosses) => onUpdate(mule.id, { selectedBosses })}
            abbreviated={abbreviated}
          />

          {confirmDelete ? (
            <Alert variant="destructive">
              <div className="flex items-center justify-between">
                <p className="text-sm">Delete this mule?</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(mule.id)}>
                    Yes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Alert>
          ) : (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={() => setConfirmDelete(true)}
              >
                <IconTrash className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}