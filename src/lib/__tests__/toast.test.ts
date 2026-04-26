import { describe, expect, it, vi, beforeEach } from 'vitest';

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

import { toast } from '../toast';

beforeEach(() => {
  sonnerMock.toast.mockClear();
  sonnerMock.toast.success.mockClear();
  sonnerMock.toast.error.mockClear();
  sonnerMock.toast.info.mockClear();
  sonnerMock.toast.dismiss.mockClear();
  sonnerMock.toast.getToasts.mockReset();
  sonnerMock.toast.getToasts.mockReturnValue([]);
});

describe('toast helper', () => {
  it('success() forwards the message to sonner.toast.success', () => {
    toast.success('hello');
    expect(sonnerMock.toast.success).toHaveBeenCalledTimes(1);
    expect(sonnerMock.toast.success).toHaveBeenCalledWith('hello', undefined);
  });

  it('success() forwards description and action options through to sonner.toast.success', () => {
    const onClick = vi.fn();
    toast.success('Successfully deleted', {
      description: 'Alice removed from roster',
      action: { label: 'Undo', onClick },
    });
    expect(sonnerMock.toast.success).toHaveBeenCalledWith('Successfully deleted', {
      description: 'Alice removed from roster',
      action: { label: 'Undo', onClick },
    });
  });

  it('does not dismiss anything when fewer than 3 toasts are visible', () => {
    sonnerMock.toast.getToasts.mockReturnValue([{ id: 'a' }, { id: 'b' }]);
    toast.success('third');
    expect(sonnerMock.toast.dismiss).not.toHaveBeenCalled();
    expect(sonnerMock.toast.success).toHaveBeenCalledWith('third', undefined);
  });

  it('dismisses the oldest toast when a 4th is fired', () => {
    sonnerMock.toast.getToasts.mockReturnValue([{ id: 'oldest' }, { id: 'mid' }, { id: 'newest' }]);
    toast.success('fourth');
    expect(sonnerMock.toast.dismiss).toHaveBeenCalledTimes(1);
    expect(sonnerMock.toast.dismiss).toHaveBeenCalledWith('oldest');
    expect(sonnerMock.toast.success).toHaveBeenCalledWith('fourth', undefined);
  });

  it('error() also evicts the oldest when at the cap', () => {
    sonnerMock.toast.getToasts.mockReturnValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    toast.error('boom');
    expect(sonnerMock.toast.dismiss).toHaveBeenCalledWith(1);
    expect(sonnerMock.toast.error).toHaveBeenCalledWith('boom', undefined);
  });
});
