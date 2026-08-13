import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const commit =
  process.env.GITHUB_SHA?.slice(0, 7) ??
  (() => {
    try {
      return execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      return "development";
    }
  })();

const codespaceHost =
  process.env.CODESPACE_NAME &&
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;

export default defineConfig(({ command }) => {
  const base = command === "build" ? "/liver-workbench/" : "/";
  return {
    base,
    server: {
      host: "0.0.0.0",
      allowedHosts: codespaceHost ? [codespaceHost] : [],
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icon.svg"],
        manifest: {
          name: "Liver Workbench",
          short_name: "Liver Workbench",
          description:
            "肝疾患の入力値と国内ガイドライン等の記載・スコアとの対応を整理する参照ツール",
          theme_color: "#145c45",
          background_color: "#f2f6f3",
          display: "standalone",
          start_url: "/liver-workbench/",
          scope: "/liver-workbench/",
          icons: [
            {
              src: "icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
        workbox: {
          mode: "development",
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff2}"],
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version ?? "1.0.0",
      ),
      __COMMIT_SHA__: JSON.stringify(commit),
    },
  };
});
