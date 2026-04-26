import { toast as sonner } from 'sonner';

type ToastOptions = Parameters<typeof sonner.success>[1];

const MAX_VISIBLE = 3;

function evictOldestIfFull() {
  const active = sonner.getToasts();
  if (active.length < MAX_VISIBLE) return;
  const oldest = active[0];
  if (oldest && 'id' in oldest && oldest.id != null) {
    sonner.dismiss(oldest.id);
  }
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => {
    evictOldestIfFull();
    return sonner.success(title, opts);
  },
  error: (title: string, opts?: ToastOptions) => {
    evictOldestIfFull();
    return sonner.error(title, opts);
  },
};
