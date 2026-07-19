"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

interface SelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

// Desplegable accesible (Radix) estilizado al tema del proyecto.
// Reemplaza el <select> nativo por un menú animado y coherente.
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Selecciona…",
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted focus:ring-2 focus:ring-ring/40 hover:border-primary/40"
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-card
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
            data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
            data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o}
                value={o}
                className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition data-[highlighted]:bg-surface-2 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
              >
                <SelectPrimitive.ItemText>{o}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
