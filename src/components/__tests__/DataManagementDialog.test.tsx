import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { render, screen, fireEvent, waitFor, act } from '@/test/test-utils';

const sonnerMock = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    getToasts: vi.fn(() => [] as Array<{ id: string | number }>),
  }),
}));

vi.mock('sonner', () => sonnerMock);

import { DataManagementDialog } from '../DataManagementDialog';

const TRACKER_KEY = 'maplestory-mule-tracker';
const WORLD_KEY = 'world';
const CHANGELOG_KEY = 'lastSeenChangelog';
const USER_PRESET_KEY = 'maplestory-mule-tracker-user-presets';

function makeValidCode(
  data: Partial<
    Record<
      typeof TRACKER_KEY | typeof WORLD_KEY | typeof CHANGELOG_KEY | typeof USER_PRESET_KEY,
      string
    >
  > = {},
) {
  return compressToEncodedURIComponent(
    JSON.stringify({
      app: 'yabi',
      exportVersion: 2,
      exportedAt: '2026-05-04T00:00:00.000Z',
      data: {
        [TRACKER_KEY]: data[TRACKER_KEY] ?? '',
        [WORLD_KEY]: data[WORLD_KEY] ?? '',
        [CHANGELOG_KEY]: data[CHANGELOG_KEY] ?? '',
        [USER_PRESET_KEY]: data[USER_PRESET_KEY] ?? '',
      },
    }),
  );
}

function trackerBlob(mules: Array<{ id: string; worldId: string }>): string {
  return JSON.stringify({
    schemaVersion: 6,
    mules: mules.map((m) => ({
      id: m.id,
      name: m.id,
      level: 200,
      muleClass: 'Hero',
      selectedBosses: [],
      partySizes: {},
      active: true,
      worldId: m.worldId,
    })),
  });
}

describe('DataManagementDialog (chooser screen)', () => {
  it('does not render when closed', () => {
    render(<DataManagementDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText('Data Management')).toBeNull();
  });

  it('renders the chooser title and both option rows when open', async () => {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Data Management')).toBeTruthy();
    });
    expect(screen.getByText('Export Data')).toBeTruthy();
    expect(screen.getByText('Generate transfer code')).toBeTruthy();
    expect(screen.getByText('Import Data')).toBeTruthy();
    expect(screen.getByText('Paste transfer code')).toBeTruthy();
  });

  it('clicking Export advances internal state (chooser content goes away)', async () => {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Export Data/ }));
    await waitFor(() => {
      expect(screen.queryByText('Generate transfer code')).toBeNull();
    });
  });

  it('clicking Import advances internal state (chooser content goes away)', async () => {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Import Data/ }));
    await waitFor(() => {
      expect(screen.queryByText('Paste transfer code')).toBeNull();
    });
  });

  it('Escape closes the dialog (calls onOpenChange with false)', async () => {
    const onOpenChange = vi.fn();
    render(<DataManagementDialog open={true} onOpenChange={onOpenChange} />);
    await waitFor(() => {
      expect(screen.getByText('Data Management')).toBeTruthy();
    });
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
      code: 'Escape',
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('DataManagementDialog (import paste screen)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  async function openImport() {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Import Data/ }));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
  }

  it('shows a textarea, Cancel, and Import after clicking Import on chooser', async () => {
    await openImport();
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
  });

  it('Cancel returns to chooser', async () => {
    await openImport();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('Generate transfer code')).toBeTruthy();
    });
  });

  it('shows inline error and preserves pasted text on invalid code', async () => {
    await openImport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'not a real code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(screen.getByText('Invalid YABI transfer code')).toBeTruthy();
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('not a real code');
  });

  it('advances to the confirm screen on a valid code', async () => {
    await openImport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: makeValidCode() } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(screen.getByText('Replace your data?')).toBeTruthy();
    });
  });
});

describe('DataManagementDialog (confirm screen)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  async function openConfirmWith(code: string) {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Import Data/ }));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(screen.getByText('Replace your data?')).toBeTruthy();
    });
  }

  it('renders title and body copy', async () => {
    await openConfirmWith(makeValidCode());
    expect(screen.getByText('Replace your data?')).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element?.textContent ===
            'Importing will replace all of your current data. This cannot be undone.',
      ),
    ).toBeTruthy();
  });

  it('renders Before and After section labels', async () => {
    await openConfirmWith(makeValidCode());
    expect(screen.getByText(/Before/)).toBeTruthy();
    expect(screen.getByText(/After/)).toBeTruthy();
  });

  it('renders the after summary alphabetical by world label, omitting zero-mule worlds', async () => {
    localStorage.setItem(
      TRACKER_KEY,
      trackerBlob([
        { id: 'a', worldId: 'heroic-solis' },
        { id: 'b', worldId: 'heroic-solis' },
        { id: 'c', worldId: 'heroic-kronos' },
      ]),
    );
    const code = makeValidCode({
      [TRACKER_KEY]: trackerBlob([
        { id: 'x', worldId: 'interactive-luna' },
        { id: 'y', worldId: 'heroic-hyperion' },
        { id: 'z', worldId: 'heroic-hyperion' },
      ]),
    });
    await openConfirmWith(code);
    expect(screen.getByText(/Solis/)).toBeTruthy();
    expect(screen.getByText(/Kronos/)).toBeTruthy();
    expect(screen.getByText(/Hyperion/)).toBeTruthy();
    expect(screen.getByText(/Luna/)).toBeTruthy();
    // Omit any world with zero mules — Bera/Scania never appear.
    expect(screen.queryByText(/Bera/)).toBeNull();
    expect(screen.queryByText(/Scania/)).toBeNull();
  });

  it('renders a Replace and reload button', async () => {
    await openConfirmWith(makeValidCode());
    expect(screen.getByRole('button', { name: 'Replace and reload' })).toBeTruthy();
  });

  it('Back returns to the paste screen with the pasted text preserved', async () => {
    const code = makeValidCode();
    await openConfirmWith(code);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(code);
  });
});

describe('DataManagementDialog (Replace and reload)', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    sonnerMock.toast.error.mockClear();
    sonnerMock.toast.getToasts.mockReturnValue([]);
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  async function openConfirmWith(code: string) {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Import Data/ }));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(screen.getByText('Replace your data?')).toBeTruthy();
    });
  }

  it('writes imported data to localStorage and reloads on success', async () => {
    localStorage.setItem('trackerPreference', 'maplehub');
    await openConfirmWith(makeValidCode({ [WORLD_KEY]: 'heroic-kronos' }));

    fireEvent.click(screen.getByRole('button', { name: 'Replace and reload' }));

    expect(localStorage.getItem(WORLD_KEY)).toBe('heroic-kronos');
    expect(localStorage.getItem('trackerPreference')).toBe('maplehub');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sonnerMock.toast.error).not.toHaveBeenCalled();
  });

  it('on apply failure: shows the error toast, does not reload, and stays on confirm screen', async () => {
    await openConfirmWith(makeValidCode());

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Replace and reload' }));
    } finally {
      setItemSpy.mockRestore();
    }

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(sonnerMock.toast.error).toHaveBeenCalledTimes(1);
    expect(sonnerMock.toast.error).toHaveBeenCalledWith(
      'Import failed — your data was not changed.',
      undefined,
    );
    // Still on the confirm screen.
    expect(screen.getByText('Replace your data?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Replace and reload' })).toBeTruthy();
  });
});

describe('DataManagementDialog (export screen)', () => {
  let writeText: ReturnType<typeof vi.fn>;
  let originalClipboard: PropertyDescriptor | undefined;

  beforeEach(() => {
    localStorage.clear();
    writeText = vi.fn(() => Promise.resolve());
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      // @ts-expect-error - jsdom does not ship with a clipboard
      delete (navigator as Navigator).clipboard;
    }
    vi.useRealTimers();
  });

  async function openExport() {
    render(<DataManagementDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Export Data/ }));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
  }

  it('renders a read-only textarea pre-filled with a buildExport() code', async () => {
    localStorage.setItem(TRACKER_KEY, trackerBlob([{ id: 'a', worldId: 'heroic-kronos' }]));
    localStorage.setItem(WORLD_KEY, 'heroic-kronos');
    localStorage.setItem(CHANGELOG_KEY, 'v1.0.0');
    await openExport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
    expect(textarea.value.length).toBeGreaterThan(0);
    const decompressed = decompressFromEncodedURIComponent(textarea.value);
    expect(decompressed).toBeTruthy();
    const parsed = JSON.parse(decompressed!) as { app: string; data: Record<string, string> };
    expect(parsed.app).toBe('yabi');
    expect(parsed.data[TRACKER_KEY]).toContain('heroic-kronos');
    expect(parsed.data[WORLD_KEY]).toBe('heroic-kronos');
  });

  it('does not regenerate the code on re-render', async () => {
    await openExport();
    const first = (screen.getByRole('textbox') as HTMLTextAreaElement).value;
    // Force a re-render path: click the textarea — should not change the value.
    fireEvent.click(screen.getByRole('textbox'));
    fireEvent.focus(screen.getByRole('textbox'));
    const second = (screen.getByRole('textbox') as HTMLTextAreaElement).value;
    expect(second).toBe(first);
  });

  it('selects all on focus', async () => {
    await openExport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(textarea, 'select');
    fireEvent.focus(textarea);
    expect(selectSpy).toHaveBeenCalled();
  });

  it('selects all on click', async () => {
    await openExport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(textarea, 'select');
    fireEvent.click(textarea);
    expect(selectSpy).toHaveBeenCalled();
  });

  it('shows a Copy button initially labelled "Copy"', async () => {
    await openExport();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('clicking Copy writes the code to the clipboard and toggles label to "Copied!"', async () => {
    await openExport();
    const code = (screen.getByRole('textbox') as HTMLTextAreaElement).value;
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(code);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();
    });
  });

  it('reverts label back to "Copy" 3000ms after a successful copy', async () => {
    await openExport();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    // Flush the writeText microtask without using waitFor (which doesn't
    // play well with non-auto-advancing fake timers in this setup).
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('re-clicking while showing "Copied!" stays on "Copied!" and resets the 3000ms timer', async () => {
    await openExport();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    // Re-click while still in Copied! state — button must NOT be disabled.
    const copiedBtn = screen.getByRole('button', { name: 'Copied!' });
    expect((copiedBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(copiedBtn);
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();
    // 2000ms more puts us at the *original* 4000ms — but the timer was reset
    // by the second click, so the label must still read "Copied!".
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();
    // Now advance another 1000ms (3000ms after the second click) — label reverts.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('shows "Copy failed" and selects the textarea when writeText rejects', async () => {
    writeText.mockImplementationOnce(() => Promise.reject(new Error('insecure context')));
    await openExport();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(textarea, 'select');
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy failed' })).toBeTruthy();
    });
    expect(selectSpy).toHaveBeenCalled();
  });

  it('"Copy failed" reverts to "Copy" after 3000ms', async () => {
    writeText.mockImplementationOnce(() => Promise.reject(new Error('insecure context')));
    await openExport();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copy failed' })).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('Done closes the dialog (calls onOpenChange(false))', async () => {
    const onOpenChange = vi.fn();
    render(<DataManagementDialog open={true} onOpenChange={onOpenChange} />);
    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Export Data/ }));
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('Back returns to the chooser screen', async () => {
    await openExport();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.getByText('Generate transfer code')).toBeTruthy();
    });
  });
});
