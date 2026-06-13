import { toast as sonnerToast } from 'sonner';

// Define minimal options used by the app
export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: string;
};

/**
 * Hook to expose Sonner toast functionality with a simplified API.
 * It forwards the supplied options to Sonner's `toast` function.
 */
export function useToast() {
  return {
    toast: ({ title = '', description, variant }: ToastOptions) => {
      // Sonner's toast accepts a title string as the first argument and an options object.
      sonnerToast(title, {
        description,
        ...(variant ? { variant } : {}),
      });
    },
  };
}
