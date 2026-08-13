import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const base = mode === "production" ? "/liver-workbench/" : "/";
  return {
  base,
  plugins: [react(), {
    name: "offline-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).map((file) => `${base}${file}`);
      const version = process.env.GITHUB_SHA?.slice(0, 12) ?? Date.now().toString(36);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const CACHE=${JSON.stringify(`liver-workbench-${version}`)};const PRECACHE=${JSON.stringify(assets)};self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE))));self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener("fetch",event=>{if(event.request.method!=="GET"||new URL(event.request.url).origin!==location.origin)return;if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match(${JSON.stringify(`${base}index.html`)})));return}event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)))})`
      });
    }
  }],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "1.0.0"),
    __COMMIT_SHA__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? "development")
  },
  test: { environment: "jsdom", setupFiles: "./test/setup.ts" }
};
});
