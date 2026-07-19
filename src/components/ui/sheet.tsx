"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

// Cajón lateral (drawer) para navegación e historial en móvil.
export function SheetContent({
  side = "left",
  className,
  children,
  title = "Menú",
}: {
  side?: "left" | "right";
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[86%] max-w-xs flex-col bg-surface p-4 shadow-card focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "left"
            ? "left-0 border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
            : "right-0 border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          className
        )}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
