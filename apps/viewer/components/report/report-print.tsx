"use client";

import { useEffect } from "react";

/** Native print includes the disclosed evidence and restores the user's reading state. */
export function ReportPrint() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const prepare = () => {
      opened = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          ".brand-report details:not([open])",
        ),
      ];
      opened.forEach((element) => {
        element.open = true;
      });
    };
    const restore = () => {
      opened.forEach((element) => {
        element.open = false;
      });
      opened = [];
    };
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, []);
  return null;
}
