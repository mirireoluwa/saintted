import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "https://saintted.com").replace(
    /\/$/,
    "",
  );

  return {
    plugins: [
      react(),
      {
        name: "html-site-url",
        transformIndexHtml(html) {
          let out = html.replaceAll("%SITE_URL%", siteUrl);
          let apiBase = (env.VITE_API_URL || "").trim().replace(/\/+$/, "");
          if (apiBase && !/^https?:\/\//i.test(apiBase)) {
            apiBase = `https://${apiBase.replace(/^\/+/, "")}`;
          }
          if (apiBase) {
            try {
              const u = new URL(apiBase);
              if (u.protocol === "http:" || u.protocol === "https:") {
                const href = `${apiBase.replace(/\/+$/, "")}/release-countdown/`;
                new URL(href);
                out = out.replace(
                  "</head>",
                  `<link rel="prefetch" href="${href}" crossorigin="anonymous" />\n</head>`,
                );
              }
            } catch {
              /* skip prefetch if VITE_API_URL is malformed at build time */
            }
          }
          return out;
        },
      },
    ],
  };
});
