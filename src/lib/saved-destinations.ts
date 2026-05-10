"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STORAGE_KEY = "wn:saved-destinations:v1";
const CHANGE_EVENT = "wn:saved-destinations-change";
const MIGRATION_KEY_PREFIX = "wn:saved-destinations:migrated:v1:";

const EMPTY: readonly string[] = Object.freeze([]);
let initialized = false;
let cachedRaw: string | null = null;
let cachedSnapshot: readonly string[] = EMPTY;

function readFromStorage(): readonly string[] {
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
    cachedSnapshot = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot;
}

function dispatchChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeToStorage(slugs: readonly string[]) {
  if (typeof window === "undefined") return;
  try {
    const next = JSON.stringify(slugs);
    window.localStorage.setItem(STORAGE_KEY, next);
    initialized = true;
    cachedRaw = next;
    cachedSnapshot = [...slugs];
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

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

type AuthState = { userId: string | null; ready: boolean };

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ userId: null, ready: false });

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Defer the synthetic ready=true to a microtask so React doesn't see
      // a setState during the effect body itself.
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

export function useSavedDestinations() {
  const local = useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
  const auth = useAuthState();

  useEffect(() => {
    if (!auth.ready || !auth.userId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;
    const userId = auth.userId;

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
        const localSlugs = readFromStorage();
        if (localSlugs.length > 0) {
          await sb.from("saved_destinations").upsert(
            localSlugs.map((slug) => ({ user_id: userId, slug })),
            { onConflict: "user_id,slug" }
          );
        }
        try {
          window.localStorage.setItem(migratedKey, "1");
        } catch {
          // ignore
        }
      }

      const { data, error } = await sb
        .from("saved_destinations")
        .select("slug")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      writeToStorage(data.map((row) => row.slug as string));
    }

    void migrateAndSync();

    return () => {
      cancelled = true;
    };
  }, [auth.ready, auth.userId]);

  const savedSet = useMemo(() => new Set(local), [local]);
  const isSaved = useCallback((slug: string) => savedSet.has(slug), [savedSet]);

  const toggle = useCallback(
    async (slug: string) => {
      const current = readFromStorage();
      const wasSaved = current.includes(slug);
      const next = wasSaved
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      writeToStorage(next);

      if (auth.userId) {
        const supabase = createSupabaseBrowserClient();
        if (supabase) {
          if (wasSaved) {
            await supabase
              .from("saved_destinations")
              .delete()
              .eq("user_id", auth.userId)
              .eq("slug", slug);
          } else {
            await supabase
              .from("saved_destinations")
              .upsert({ user_id: auth.userId, slug }, { onConflict: "user_id,slug" });
          }
        }
      }
    },
    [auth.userId]
  );

  const clear = useCallback(async () => {
    writeToStorage(EMPTY);
    if (auth.userId) {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("saved_destinations").delete().eq("user_id", auth.userId);
      }
    }
  }, [auth.userId]);

  return {
    saved: local,
    savedSet,
    count: local.length,
    isSaved,
    toggle,
    clear,
    isAuthenticated: auth.userId !== null,
    isAuthReady: auth.ready
  };
}
