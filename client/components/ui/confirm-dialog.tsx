"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * ConfirmDialog — accessible two-step confirmation built on the shadcn Dialog.
 * Focus is trapped by Base UI; Escape closes; Enter activates the default
 * (confirm) action path via the footer button order. Used for chat deletion
 * and other irreversible-feeling actions so nothing destructive is one click away.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-md rounded-2xl border-hairline bg-popover/85 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            autoFocus
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={
              destructive
                ? "rounded-lg bg-red-500/90 text-white shadow-[0_0_24px_-8px_oklch(0.62_0.21_25/80%)] hover:bg-red-500"
                : "rounded-lg bg-brand text-white hover:bg-brand/90"
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
