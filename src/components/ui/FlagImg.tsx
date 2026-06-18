"use client";

import { useState } from "react";
import { getFlagUrl, getCountryFlag } from "@/lib/currency";

export default function FlagImg({ code, className = "w-5 h-5 rounded-sm object-cover shrink-0" }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className={`inline-flex items-center justify-center text-base ${className}`}>{getCountryFlag(code)}</span>;
  }

  return (
    <img
      src={getFlagUrl(code)}
      alt={getCountryFlag(code)}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
