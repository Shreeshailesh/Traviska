import { useCallback, useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";

/**
 * Shared public trips data layer (Home "Popular Experiences" + Trips page).
 *
 * - One in-flight GET /trips shared by every consumer (no duplicate requests,
 *   including React StrictMode double effects and Home -> Trips navigation).
 * - The request starts as soon as this module is evaluated, i.e. while the app
 *   is still booting, instead of waiting for React to mount the page.
 * - Stale-while-revalidate: the last successful MongoDB response is kept in
 *   localStorage so repeat visitors see trips instantly even while the
 *   Render free-tier backend is cold-starting. Fresh data always replaces it.
 * - Retries transient failures (Render returns 502/503 while waking up) and
 *   never leaves the UI stuck in a loading state.
 */

export type TripsStatus = "loading" | "ready" | "error";

const CACHE_KEY = "traviska:trips:v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // ignore cache older than 24h
const MAX_ATTEMPTS = 3;

type Listener = () => void;

let trips: any[] | null = readCache();
let status: TripsStatus = trips ? "ready" : "loading";
let inflight: Promise<void> | null = null;
let fetchedThisSession = false;
const listeners = new Set<Listener>();

function readCache(): any[] | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - Number(parsed.savedAt || 0) > CACHE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: any[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* storage full / private mode - ignore */
  }
}

function emit() {
  snapshot = { trips: trips ?? [], status };
  listeners.forEach((l) => l());
}

let snapshot: { trips: any[]; status: TripsStatus } = { trips: trips ?? [], status };
const getSnapshot = () => snapshot;
const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const isRetryable = (err: any) => {
  const code = err?.response?.status;
  return !err?.response || code === 502 || code === 503 || code === 504 || code === 429;
};

async function requestTrips(): Promise<void> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/trips`);
      const list = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : [];
      trips = list;
      status = "ready";
      fetchedThisSession = true;
      writeCache(list);
      emit();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) break;
      // Back off briefly (1.5s, 3s) - only on failure, never on the success path.
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  console.error("Failed to fetch trips:", lastErr);
  // Keep showing previously cached trips if we have them; otherwise show error state.
  status = trips ? "ready" : "error";
  emit();
}

/** Start (or join) the GET /trips request. Safe to call any number of times. */
export function loadTrips(force = false): Promise<void> {
  if (inflight) return inflight;
  if (fetchedThisSession && !force) return Promise.resolve();
  if (!trips) {
    status = "loading";
    emit();
  }
  inflight = requestTrips().finally(() => {
    inflight = null;
  });
  return inflight;
}

// Kick off the request immediately while the app boots (public pages only need this).
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  if (path === "/" || path === "/trips") loadTrips();
}

/** React hook used by Home (Popular Experiences) and the Trips page. */
export function useTrips() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    loadTrips(); // joins the in-flight request, or revalidates once per session
  }, []);

  const retry = useCallback(() => {
    loadTrips(true);
  }, []);

  return {
    trips: snap.trips,
    loading: snap.status === "loading",
    error: snap.status === "error",
    retry,
  };
}
