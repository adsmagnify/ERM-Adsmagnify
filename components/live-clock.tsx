"use client";

import { useLayoutEffect, useRef } from "react";
import { TIMEZONE } from "@/lib/time";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

export function LiveClock() {
  const dateRef = useRef<HTMLParagraphElement>(null);
  const timeRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const tick = () => {
      const now = new Date();
      if (dateRef.current) dateRef.current.textContent = dateFmt.format(now);
      if (timeRef.current) timeRef.current.textContent = timeFmt.format(now);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <p ref={dateRef} className="text-base text-muted-foreground sm:text-lg">
        {"\u00a0"}
      </p>
      <p
        ref={timeRef}
        className="font-heading mt-3 text-5xl leading-none font-medium tracking-tight text-foreground tabular-nums sm:text-7xl md:text-8xl"
        aria-live="polite"
        aria-atomic="true"
      >
        —:—:—
      </p>
      <p className="mt-3 text-sm text-muted-foreground">IST</p>
    </div>
  );
}
