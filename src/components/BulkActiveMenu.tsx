import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';

interface BulkActiveMenuProps {
  /**
   * Converge every Bulk-Selected Mule to the chosen Active Flag state.
   * `true` = Set Active, `false` = Set Inactive. Directional, not a toggle —
   * the caller applies it to the whole selection and no-ops matching mules.
   */
  onSetActive: (active: boolean) => void;
  /** Disabled at zero selected. */
  disabled: boolean;
}

// The Active Flag color key — matches the green dot the retired Mule Actions
// Menu led its Active row with, keeping the flag's visual language consistent.
const ACTIVE_GREEN = 'var(--chart-4, #4ade80)';

function ActiveDot() {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: ACTIVE_GREEN,
        border: `1.5px solid ${ACTIVE_GREEN}`,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * **Set Active / Set Inactive** dropdown for the Bulk Action Bar. Two explicit
 * directional Active Flag actions — each applies its state to every
 * Bulk-Selected Mule, converging mixed selections; already-matching mules
 * no-op (handled by the caller). Not a per-mule toggle.
 *
 * Built on the shared Base UI `DropdownMenu` primitives, so it is
 * keyboard-reachable and works on all pointer types. The trigger is styled as
 * a small outline button to sit alongside the bar's other action controls.
 */
export function BulkActiveMenu({ onSetActive, disabled }: BulkActiveMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-bulk-active-trigger
        disabled={disabled}
        aria-label="Set active flag for selected mules"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Active
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
        <DropdownMenuItem onClick={() => onSetActive(true)}>
          <ActiveDot />
          <span style={{ flex: 1 }}>Set Active</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetActive(false)}>
          <ActiveDot />
          <span style={{ flex: 1 }}>Set Inactive</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
