"use client";
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "triad-paths:sound";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

/** Whether shapes sound when pointed at. A per-viewer preference, on unless turned off. */
export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // ignore (private mode, storage disabled): the choice lasts until the page reloads
    }
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}
