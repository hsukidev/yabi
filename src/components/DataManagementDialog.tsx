import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import {
  applyImport,
  buildExport,
  decodeImport,
  summarizeImport,
  type ExportEnvelope,
  type SummaryResult,
} from '../lib/dataTransfer';
import { toast } from '../lib/toast';

type Screen = 'chooser' | 'export' | 'import' | 'confirm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataManagementDialog({ open, onOpenChange }: Props) {
  const [screen, setScreen] = useState<Screen>('chooser');
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState(false);
  const [decoded, setDecoded] = useState<ExportEnvelope | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setScreen('chooser');
      setImportCode('');
      setImportError(false);
      setDecoded(null);
    }
    onOpenChange(next);
  };

  const handleImportClick = () => {
    const result = decodeImport(importCode);
    if (!result.ok) {
      setImportError(true);
      return;
    }
    setImportError(false);
    setDecoded(result.payload);
    setScreen('confirm');
  };

  const handleApplyImport = () => {
    if (!decoded) return;
    const result = applyImport(decoded);
    if (result.ok) {
      window.location.reload();
    } else {
      toast.error('Import failed — your data was not changed.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>
            {screen === 'confirm' ? 'Replace your data?' : 'Data Management'}
          </DialogTitle>
        </DialogHeader>
        {screen === 'chooser' && (
          <div className="flex flex-col gap-2">
            <ChooserRow
              icon={<Download size={20} />}
              label="Export Data"
              description="Generate transfer code"
              onClick={() => setScreen('export')}
            />
            <ChooserRow
              icon={<Upload size={20} />}
              label="Import Data"
              description="Paste transfer code"
              onClick={() => setScreen('import')}
            />
          </div>
        )}
        {screen === 'export' && (
          <ExportScreen
            onBack={() => setScreen('chooser')}
            onDone={() => handleOpenChange(false)}
          />
        )}
        {screen === 'import' && (
          <ImportPasteScreen
            code={importCode}
            error={importError}
            onCodeChange={(next) => {
              setImportCode(next);
              if (importError) setImportError(false);
            }}
            onCancel={() => {
              setScreen('chooser');
              setImportCode('');
              setImportError(false);
            }}
            onImport={handleImportClick}
          />
        )}
        {screen === 'confirm' && decoded && (
          <ConfirmScreen
            summary={summarizeImport(decoded)}
            onBack={() => setScreen('import')}
            onApply={handleApplyImport}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ChooserRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function ChooserRow({ icon, label, description, onClick }: ChooserRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-md border border-border p-3 text-left transition-colors cursor-pointer hover:bg-(--accent-soft)"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABELS: Record<CopyState, string> = {
  idle: 'Copy',
  copied: 'Copied!',
  failed: 'Copy failed',
};

interface ExportScreenProps {
  onBack: () => void;
  onDone: () => void;
}

function ExportScreen({ onBack, onDone }: ExportScreenProps) {
  const [code] = useState(buildExport);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // Re-arm on every Copy click — clicking while in 'copied' (or 'failed')
  // resets the 3000ms timer rather than disabling the button.
  const armRevertTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopyState('idle');
      timerRef.current = null;
    }, 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
      textareaRef.current?.select();
    }
    armRevertTimer();
  };

  const selectAll = () => textareaRef.current?.select();

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={code}
        readOnly
        rows={6}
        className="font-mono text-xs"
        onFocus={selectAll}
        onClick={selectAll}
      />
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {COPY_LABELS[copyState]}
          </Button>
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    </div>
  );
}

interface ImportPasteScreenProps {
  code: string;
  error: boolean;
  onCodeChange: (next: string) => void;
  onCancel: () => void;
  onImport: () => void;
}

function ImportPasteScreen({
  code,
  error,
  onCodeChange,
  onCancel,
  onImport,
}: ImportPasteScreenProps) {
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        rows={6}
        className="font-mono text-xs"
        placeholder="Paste your YABI transfer code here"
        aria-invalid={error || undefined}
      />
      {error && <p className="text-sm text-destructive">Invalid YABI transfer code</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onImport}>Import</Button>
      </div>
    </div>
  );
}

interface ConfirmScreenProps {
  summary: SummaryResult;
  onBack: () => void;
  onApply: () => void;
}

function ConfirmScreen({ summary, onBack, onApply }: ConfirmScreenProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Importing will replace all of your current data.{' '}
        <span className="text-destructive">This cannot be undone.</span>
      </p>
      <SummarySection label="Before" counts={summary.before} />
      <SummarySection label="After" counts={summary.after} />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onApply}>Replace and reload</Button>
      </div>
    </div>
  );
}

interface SummarySectionProps {
  label: string;
  counts: SummaryResult['before'];
}

function SummarySection({ label, counts }: SummarySectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-center font-mono text-xs text-muted-foreground">─── {label} ───</p>
      {counts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No mules</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {counts.map((c) => (
            <li key={c.worldLabel} className="flex justify-between text-sm text-foreground">
              <span>{c.worldLabel}</span>
              <span className="text-muted-foreground">
                {c.count} {c.count === 1 ? 'mule' : 'mules'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
