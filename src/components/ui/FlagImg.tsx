"use client";

import * as Flags from "country-flag-icons/react/3x2";

export default function FlagImg({ code, className = "w-5 h-5 rounded-sm shrink-0" }: { code: string; className?: string }) {
  const Flag = (Flags as Record<string, React.ComponentType<{ className?: string; title?: string }>>)[code];
  if (!Flag) return null;
  return <Flag className={className} />;
}
