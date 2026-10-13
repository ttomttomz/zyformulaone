import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Career } from "../engine/types";

// Saves live in an in-memory cache so reads stay synchronous for the UI.
// Web: localStorage. Android: Capacitor Preferences (app-private storage the OS won't clear on its own).
const key = (slot: number) => `zyf1.slot.${slot}`;
export const SLOT_COUNT = 3;
const native = Capacitor.isNativePlatform();
const cache = new Map<number, string | null>();

export async function initStorage() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    try {
      cache.set(i, native ? (await Preferences.get({ key: key(i) })).value : localStorage.getItem(key(i)));
    } catch {
      cache.set(i, null);
    }
  }
}

function write(slot: number, raw: string | null) {
  cache.set(slot, raw);
  try {
    if (native) {
      void (raw === null ? Preferences.remove({ key: key(slot) }) : Preferences.set({ key: key(slot), value: raw }));
    } else if (raw === null) localStorage.removeItem(key(slot));
    else localStorage.setItem(key(slot), raw);
  } catch {
    /* storage unavailable: play continues unsaved */
  }
}

export function loadSlot(slot: number): Career | null {
  const raw = cache.get(slot);
  try {
    return raw ? (JSON.parse(raw) as Career) : null;
  } catch {
    return null;
  }
}

export const saveSlot = (slot: number, c: Career) => write(slot, JSON.stringify(c));
export const deleteSlot = (slot: number) => write(slot, null);
