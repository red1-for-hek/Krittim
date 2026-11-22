'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { applyThemeEffect } from '@/store/chatStore';

/**
 * ThemeSync — mounts once in RootLayout so theme switching and Sonner toasts
 * work consistently across every route (/, /chat/*, /settings, /profile, /login, /signup, /testmodel).
 */
export function ThemeSync() {
  useEffect(() => applyThemeEffect(), []);

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className:
          '!rounded-xl !border !border-hairline !bg-popover !backdrop-blur-xl !text-popover-foreground !shadow-[0_20px_50px_-18px_rgba(0,0,0,0.45)]',
        duration: 2600,
      }}
      closeButton
      richColors={false}
    />
  );
}
