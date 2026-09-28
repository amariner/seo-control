"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca la página mientras el crawl avanza (D-070). */
export function AutoRefresh({ everyMs = 2500 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);
  return null;
}
