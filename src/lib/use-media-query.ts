"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * True while `query` matches (`matchMedia`). The server snapshot is false, so a page that
 * branches on it must render that branch only after mount to stay hydration-safe.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
