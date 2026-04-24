import { toast as sonner } from 'sonner';

type ToastOptions = Parameters<typeof sonner>[1];

export const toast = {
  success: (message: string, opts?: ToastOptions) => sonner.success(message, opts),
};
