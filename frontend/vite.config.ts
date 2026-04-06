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
          const apiBase = (env.VITE_API_URL || "").trim().replace(/\/+$/, "");
          if (apiBase) {
            out = out.replace(
              "</head>",
              `<link rel="prefetch" href="${apiBase}/release-countdown/" crossorigin="anonymous" />\n</head>`
            );
          }
          return out;
        },
      },
    ],
  };
});
