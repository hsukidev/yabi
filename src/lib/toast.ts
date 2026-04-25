import { toast as sonner } from 'sonner';

type ToastOptions = Parameters<typeof sonner.success>[1];

export const toast = {
  success: (title: string, opts?: ToastOptions) => sonner.success(title, opts),
  error: (title: string, opts?: ToastOptions) => sonner.error(title, opts),
};
