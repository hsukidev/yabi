import { useState } from 'react';
import { Settings, Database, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { DataManagementDialog } from './DataManagementDialog';
import { TrackerPreferenceDialog } from './TrackerPreferenceDialog';

type ActiveDialog = 'data-management' | 'tracker-preference' | null;

export function SettingsMenu() {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-8 items-center justify-center rounded-md transition-colors cursor-pointer"
          style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
          aria-label="Settings"
        >
          <Settings size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => setActiveDialog('data-management')}
            className="data-highlighted:bg-(--accent-soft) data-highlighted:text-(--accent-raw)"
          >
            <Database />
            Data Management
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setActiveDialog('tracker-preference')}
            className="data-highlighted:bg-(--accent-soft) data-highlighted:text-(--accent-raw)"
          >
            <ExternalLink />
            Tracker Preference
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DataManagementDialog
        open={activeDialog === 'data-management'}
        onOpenChange={(open) => setActiveDialog(open ? 'data-management' : null)}
      />
      <TrackerPreferenceDialog
        open={activeDialog === 'tracker-preference'}
        onOpenChange={(open) => setActiveDialog(open ? 'tracker-preference' : null)}
      />
    </>
  );
}
