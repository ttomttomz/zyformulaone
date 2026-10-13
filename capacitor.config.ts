import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ttomttomz.zyformulaone",
  appName: "ZyFormulaOne",
  webDir: "dist",
  backgroundColor: "#0b0d12",
  android: {
    backgroundColor: "#0b0d12",
  },
  plugins: {
    SystemBars: {
      // Injects --safe-area-inset-* CSS variables so the UI avoids the status/navigation bars.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
  },
};

export default config;
