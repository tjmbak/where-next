"use client";

// Watch-anything: local-first subscriptions to a (destination, month, year)
// window, synced to Supabase when the user is signed in (mirrors the
// saved-destinations pattern). Signed-in watches power email alerts via the
// watch-alerts cron; anonymous watches live on this device until sign-in,
// then migrate up automatically.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MonthNumber } from "@/types/content";

export type Watch = {
  slug: string;
  month: MonthNumber;
  year: number;
};

export function watchKey(watch: Watch): string {
  return `${watch.slug}:${watch.month}:${watch.year}`;
}

const STORAGE_KEY = "wn:watches:v1";
const CHANGE_EVENT = "wn:watches-change";
const MIGRATION_KEY_PREFIX = "wn:watches:migrated:v1:";

const EMPTY: readonly Watch[] = Object.freeze([]);
let initialized = false;
let cachedRaw: string | null = null;
let cachedSnapshot: readonly Watch[] = EMPTY;

function isWatch(value: unknown): value is Watch {
  if (!value || typeof value !== "object") return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.slug === "string" &&
    typeof w.month === "number" &&
    w.month >= 1 &&
    w.month <= 12 &&
    typeof w.year === "number"
  );
}

function readFromStorage(): readonly Watch[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedSnapshot;
  }
  if (initialized && raw === cachedRaw) return cachedSnapshot;
  initialized = true;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = EMPTY;
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedSnapshot = Array.isArray(parsed) ? parsed.filter(isWatch) : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot;
}

function dispatchChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeToStorage(watches: readonly Watch[]) {
  if (typeof window === "undefined") return;
  try {
    const next = JSON.stringify(watches);
    window.localStorage.setItem(STORAGE_KEY, next);
    initialized = true;
    cachedRaw = next;
    cachedSnapshot = [...watches];
  } catch {
    // ignore quota / private mode errors
  }
  dispatchChange();
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getServerSnapshot(): readonly Watch[] {
  return EMPTY;
}

type AuthState = { userId: string | null; ready: boolean };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ userId: null, ready: false });

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        if (active) setState({ userId: null, ready: true });
      });
      return () => {
        active = false;
      };
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setState({ userId: data.user?.id ?? null, ready: true });
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ userId: session?.user.id ?? null, ready: true });
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useWatches() {
  const local = useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
  const auth = useAuthState();

  useEffect(() => {
    if (!auth.ready || !auth.userId) return;
    const userId = auth.userId;
    let cancelled = false;

    async function migrateAndSync() {
      const sb = createSupabaseBrowserClient();
      if (!sb || cancelled) return;

      const migratedKey = `${MIGRATION_KEY_PREFIX}${userId}`;
      let alreadyMigrated = false;
      try {
        alreadyMigrated = window.localStorage.getItem(migratedKey) === "1";
      } catch {
        alreadyMigrated = true;
      }

      if (!alreadyMigrated) {
        const localWatches = readFromStorage();
        if (localWatches.length > 0) {
          await sb.from("watches").upsert(
            localWatches.map((w) => ({
              user_id: userId,
              slug: w.slug,
              month: w.month,
              year: w.year
            })),
            { onConflict: "user_id,slug,month,year" }
          );
        }
        try {
          window.localStorage.setItem(migratedKey, "1");
        } catch {
          // ignore
        }
      }

      const { data, error } = await sb
        .from("watches")
        .select("slug, month, year")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      writeToStorage(data.filter(isWatch) as Watch[]);
    }

    void migrateAndSync();

    return () => {
      cancelled = true;
    };
  }, [auth.ready, auth.userId]);

  const keys = useMemo(() => new Set(local.map(watchKey)), [local]);

  const isWatching = useCallback(
    (watch: Watch) => keys.has(watchKey(watch)),
    [keys]
  );

  const toggle = useCallback(
    async (watch: Watch) => {
      const current = readFromStorage();
      const key = watchKey(watch);
      const wasWatching = current.some((w) => watchKey(w) === key);
      const next = wasWatching
        ? current.filter((w) => watchKey(w) !== key)
        : [...current, watch];
      writeToStorage(next);

      if (auth.userId) {
        const supabase = createSupabaseBrowserClient();
        if (supabase) {
          if (wasWatching) {
            await supabase
              .from("watches")
              .delete()
              .eq("user_id", auth.userId)
              .eq("slug", watch.slug)
              .eq("month", watch.month)
              .eq("year", watch.year);
          } else {
            await supabase.from("watches").upsert(
              {
                user_id: auth.userId,
                slug: watch.slug,
                month: watch.month,
                year: watch.year
              },
              { onConflict: "user_id,slug,month,year" }
            );
          }
        }
      }
      return !wasWatching;
    },
    [auth.userId]
  );

  return {
    watches: local,
    count: local.length,
    isWatching,
    toggle,
    isAuthenticated: auth.userId !== null,
    isAuthReady: auth.ready
  };
}
