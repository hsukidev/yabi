import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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

import { useMuleActions } from '../useMuleActions';

let localStorageStore: Record<string, string> = {};
let sessionStorageStore: Record<string, string> = {};

beforeEach(() => {
  localStorageStore = {};
  sessionStorageStore = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key];
    }),
    clear: vi.fn(() => {
      localStorageStore = {};
    }),
    get length() {
      return Object.keys(localStorageStore).length;
    },
    key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      sessionStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete sessionStorageStore[key];
    }),
    clear: vi.fn(() => {
      sessionStorageStore = {};
    }),
    get length() {
      return Object.keys(sessionStorageStore).length;
    },
    key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] ?? null),
  });
  sonnerMock.toast.mockClear();
  sonnerMock.toast.success.mockClear();
  sonnerMock.toast.error.mockClear();
  sonnerMock.toast.info.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useMuleActions', () => {
  describe('deleteMule', () => {
    it('removes the matching mule from state', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.deleteMule(id);
      });
      expect(result.current.mules).toEqual([]);
    });

    it('fires toast.success with title, named description, and an Undo action', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, { name: 'Alice' });
      });
      act(() => {
        result.current.deleteMule(id);
      });
      expect(sonnerMock.toast.success).toHaveBeenCalledTimes(1);
      expect(sonnerMock.toast.success).toHaveBeenCalledWith(
        'Successfully deleted',
        expect.objectContaining({
          description: 'Alice removed from roster',
          action: expect.objectContaining({
            label: 'Undo',
            onClick: expect.any(Function),
          }),
        }),
      );
    });

    it('Undo restores the deleted mule at its original index', () => {
      const { result } = renderHook(() => useMuleActions());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.deleteMule(ids[1]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[2]]);
      const call = sonnerMock.toast.success.mock.calls.at(-1);
      const onUndo = call?.[1]?.action?.onClick as () => void;
      act(() => {
        onUndo();
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[1], ids[2]]);
    });

    it('falls back to "Mule removed from roster" when the name is empty', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.deleteMule(id);
      });
      expect(sonnerMock.toast.success).toHaveBeenCalledWith(
        'Successfully deleted',
        expect.objectContaining({
          description: 'Mule removed from roster',
        }),
      );
    });
  });

  describe('deleteMules (batch)', () => {
    it('removes all listed mules from state', () => {
      const { result } = renderHook(() => useMuleActions());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.deleteMules([ids[0], ids[2]]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[1]]);
    });

    it('fires toast.success exactly once with a pluralized description and an Undo action', () => {
      const { result } = renderHook(() => useMuleActions());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.deleteMules([ids[0], ids[1], ids[2]]);
      });
      expect(sonnerMock.toast.success).toHaveBeenCalledTimes(1);
      expect(sonnerMock.toast.success).toHaveBeenCalledWith(
        'Successfully deleted',
        expect.objectContaining({
          description: '3 mules removed',
          action: expect.objectContaining({
            label: 'Undo',
            onClick: expect.any(Function),
          }),
        }),
      );
    });

    it('uses the named "${name} removed from roster" format when only one id is deleted via the batch API', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, { name: 'Alice' });
      });
      act(() => {
        result.current.deleteMules([id]);
      });
      expect(sonnerMock.toast.success).toHaveBeenCalledWith(
        'Successfully deleted',
        expect.objectContaining({
          description: 'Alice removed from roster',
        }),
      );
    });

    it('falls back to "Mule removed from roster" when the single batch-deleted mule has an empty name', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.deleteMules([id]);
      });
      expect(sonnerMock.toast.success).toHaveBeenCalledWith(
        'Successfully deleted',
        expect.objectContaining({
          description: 'Mule removed from roster',
        }),
      );
    });

    it('Undo restores every bulk-deleted mule at its original position', () => {
      const { result } = renderHook(() => useMuleActions());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.deleteMules([ids[1], ids[3]]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[2]]);
      const call = sonnerMock.toast.success.mock.calls.at(-1);
      const onUndo = call?.[1]?.action?.onClick as () => void;
      act(() => {
        onUndo();
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[1], ids[2], ids[3]]);
    });

    it('does not toast when ids is empty', () => {
      const { result } = renderHook(() => useMuleActions());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.deleteMules([]);
      });
      expect(sonnerMock.toast.success).not.toHaveBeenCalled();
    });
  });

  describe('pass-through mutations', () => {
    it('addMule creates a mule and does not toast', () => {
      const { result } = renderHook(() => useMuleActions());
      let id: string | undefined;
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      expect(result.current.mules).toHaveLength(1);
      expect(result.current.mules[0].id).toBe(id);
      expect(sonnerMock.toast.success).not.toHaveBeenCalled();
    });

    it('updateMule merges updates and does not toast', () => {
      const { result } = renderHook(() => useMuleActions());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, { name: 'Alice', level: 250 });
      });
      expect(result.current.mules[0].name).toBe('Alice');
      expect(result.current.mules[0].level).toBe(250);
      expect(sonnerMock.toast.success).not.toHaveBeenCalled();
    });

    it('reorderMules moves mules and does not toast', () => {
      const { result } = renderHook(() => useMuleActions());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.reorderMules(0, 1);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[1], ids[0]]);
      expect(sonnerMock.toast.success).not.toHaveBeenCalled();
    });
  });
});
