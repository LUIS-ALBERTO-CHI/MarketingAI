"use client";

import type { ComponentType } from "react";
import {
  Megaphone,
  PencilSimple,
  Lightbulb,
  EnvelopeSimple,
  Hash,
  Target,
  CalendarDots,
  MagicWand,
  FilmSlate,
  TrendUp,
  Palette,
  Table,
  ImageSquare,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

type IconCmp = ComponentType<{
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

// Los nombres provienen de tools.ts (t.icon). Se mapean a iconos Phosphor con
// peso "fill" (relleno) para un acabado sólido y redondeado tipo redes sociales.
const ICONS: Record<string, IconCmp> = {
  Megaphone,
  PenLine: PencilSimple,
  Lightbulb,
  Mail: EnvelopeSimple,
  Hash,
  Target,
  CalendarDays: CalendarDots,
  Wand2: MagicWand,
  Clapperboard: FilmSlate,
  TrendingUp: TrendUp,
  Palette,
  Table,
  PostImage: ImageSquare,
};

// Por defecto los iconos son de línea (outline). El relleno ("fill") se reserva
// para el elemento activo/seleccionado — como en la barra de Facebook.
export function ToolIcon({
  name,
  className,
  weight = "regular",
}: {
  name: string;
  className?: string;
  weight?: "regular" | "fill" | "bold";
}) {
  const Cmp = ICONS[name] ?? Sparkle;
  return <Cmp weight={weight} className={className} aria-hidden="true" />;
}
