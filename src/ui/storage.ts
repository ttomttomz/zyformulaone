import type { Career } from "../engine/types";

// Mock-only persistence. The Android build will swap this for device storage.
const key = (slot: number) => `zyf1.slot.${slot}`;
export const SLOT_COUNT = 3;

export function loadSlot(slot: number): Career | null {
  try {
    const raw = localStorage.getItem(key(slot));
    return raw ? (JSON.parse(raw) as Career) : null;
  } catch {
    return null;
  }
}

export function saveSlot(slot: number, c: Career) {
  try {
    localStorage.setItem(key(slot), JSON.stringify(c));
  } catch {
    /* storage unavailable: play continues unsaved */
  }
}

export function deleteSlot(slot: number) {
  try {
    localStorage.removeItem(key(slot));
  } catch {
    /* ignore */
  }
}
