"use client";

import { useMemo } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildTimes(stepMinutes: number) {
  const out: string[] = [];
  // 00:00..23:45 (kalau step 15)
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      out.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  // add 24:00 as special value
  out.push("24:00");
  return out;
}

export default function TimeSelect({
  value,
  onChange,
  stepMinutes = 15,
  disabled,
  ariaLabel = "Pilih waktu",
}: {
  value: string;
  onChange: (v: string) => void;
  stepMinutes?: number;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const options = useMemo(() => buildTimes(stepMinutes), [stepMinutes]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="border rounded px-2 py-1 outline-0 bg-white"
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
