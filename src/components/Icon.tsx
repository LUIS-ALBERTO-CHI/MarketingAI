"use client";

import {
  Megaphone,
  PenLine,
  Lightbulb,
  Mail,
  Hash,
  Target,
  CalendarDays,
  Wand2,
  Clapperboard,
  TrendingUp,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Mapa de iconos usados por las herramientas (SVG, nunca emojis como iconos).
const ICONS: Record<string, LucideIcon> = {
  Megaphone,
  PenLine,
  Lightbulb,
  Mail,
  Hash,
  Target,
  CalendarDays,
  Wand2,
  Clapperboard,
  TrendingUp,
};

export function ToolIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={className} aria-hidden="true" />;
}
