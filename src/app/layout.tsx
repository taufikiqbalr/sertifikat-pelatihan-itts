import type { Metadata } from "next";
import "./globals.css";
import ThemeSwitcher from "./theme-switcher";

export const metadata: Metadata = {
  title: "Sertifikat ITTS",
  description: "Penerbitan dan validasi sertifikat kegiatan Institut Teknologi Tangerang Selatan"
};

const themeInitScript = `
(() => {
  try {
    const key = "itts-system-theme";
    const valid = new Set([
      "system", "itts", "light", "dark", "midnight", "ocean", "emerald", "forest",
      "indigo", "violet", "rose", "amber", "slate", "graphite", "coffee", "cyber"
    ]);
    const dark = new Set(["dark", "midnight", "graphite", "coffee", "cyber"]);
    let preference = localStorage.getItem(key) || "itts";
    if (!valid.has(preference)) preference = "itts";
    const resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = dark.has(resolved) ? "dark" : "light";
  } catch {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
