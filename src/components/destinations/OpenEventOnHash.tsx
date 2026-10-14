"use client";

import { useEffect } from "react";

/** Expands a collapsed event row when the page is opened or jumped to via `#event-…`. */
export function OpenEventOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id.startsWith("event-")) return;
      const row = document.getElementById(id);
      const details = row?.querySelector("details");
      if (!row || !details) return;
      details.open = true;
      const section = row.parentElement?.closest("details");
      if (section) section.open = true;
      row.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  return null;
}
