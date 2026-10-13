import { App as CapApp } from "@capacitor/app";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

// Android back button: close an open sheet, otherwise let the screen decide (see onBack).
let backHandler: (() => boolean) | null = null;
export const onBack = (fn: (() => boolean) | null) => { backHandler = fn; };

export function setupNative() {
  if (!Capacitor.isNativePlatform()) return;
  void SystemBars.setStyle({ style: SystemBarsStyle.Dark });
  void CapApp.addListener("backButton", () => {
    // Dismissable sheets close on a backdrop click; decision popups have no backdrop handler.
    const sheet = document.querySelector<HTMLElement>(".modal-bg[data-dismiss]");
    if (sheet) { sheet.click(); return; }
    if (backHandler && backHandler()) return;
    void CapApp.minimizeApp();
  });
}
