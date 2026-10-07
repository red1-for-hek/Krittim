'use client';

import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

/**
 * Sheet — a thin wrapper over Base UI Dialog that gives the sidebar drawer
 * its slide-in-from-edge behaviour while keeping the shadcn-style API.
 */
const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetTitle = Dialog.Title;
const SheetDescription = Dialog.Description;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Popup>,
  React.ComponentPropsWithoutRef<typeof Dialog.Popup> & { side?: 'left' | 'right' }
>(({ className, side = 'left', children, ...props }, ref) => (
  <Dialog.Portal data-slot="sheet-portal">
    <Dialog.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0',
      )}
    />
    <Dialog.Popup
      ref={ref}
      data-side={side}
      className={cn(
        'fixed inset-y-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 border-white/10 bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out data-ending-style:-translate-x-full data-starting-style:-translate-x-full data-[side=right]:translate-x-full',
        side === 'left' ? 'left-0 border-r' : 'right-0 border-l data-ending-style:translate-x-full data-starting-style:translate-x-full',
        className,
      )}
      {...props}
    >
      {children}
    </Dialog.Popup>
  </Dialog.Portal>
));
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
