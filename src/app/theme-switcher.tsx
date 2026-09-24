"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./theme-switcher.module.css";

const THEME_STORAGE_KEY = "itts-system-theme";

const themes = [
  { id: "system", label: "Sistem", note: "Ikuti perangkat", swatches: ["#f8fafc", "#0f172a", "#0f9fa8"] },
  { id: "itts", label: "ITTS", note: "Teal & magenta", swatches: ["#f5f8fa", "#0f9fa8", "#a71972"] },
  { id: "light", label: "Terang", note: "Bersih & netral", swatches: ["#ffffff", "#2563eb", "#111827"] },
  { id: "dark", label: "Gelap", note: "Nyaman di malam hari", swatches: ["#0f172a", "#2dd4bf", "#c084fc"] },
  { id: "midnight", label: "Midnight", note: "Biru malam", swatches: ["#080b16", "#7c9cff", "#d06dfd"] },
  { id: "ocean", label: "Ocean", note: "Biru laut", swatches: ["#eef8fb", "#0284c7", "#06b6d4"] },
  { id: "emerald", label: "Emerald", note: "Hijau modern", swatches: ["#f1f8f4", "#059669", "#22c55e"] },
  { id: "forest", label: "Forest", note: "Hijau natural", swatches: ["#f3f7f1", "#3f7d44", "#84a98c"] },
  { id: "indigo", label: "Indigo", note: "Biru keunguan", swatches: ["#f5f5ff", "#4f46e5", "#818cf8"] },
  { id: "violet", label: "Violet", note: "Ungu elegan", swatches: ["#faf5ff", "#7c3aed", "#c084fc"] },
  { id: "rose", label: "Rose", note: "Merah muda", swatches: ["#fff5f7", "#e11d48", "#fb7185"] },
  { id: "amber", label: "Amber", note: "Hangat & kontras", swatches: ["#fffaf0", "#d97706", "#f59e0b"] },
  { id: "slate", label: "Slate", note: "Abu profesional", swatches: ["#f4f6f8", "#475569", "#94a3b8"] },
  { id: "graphite", label: "Graphite", note: "Monokrom gelap", swatches: ["#111213", "#e4e4e7", "#60a5fa"] },
  { id: "coffee", label: "Coffee", note: "Cokelat hangat", swatches: ["#211915", "#d79b67", "#f4c95d"] },
  { id: "cyber", label: "Cyber", note: "Neon futuristik", swatches: ["#081214", "#00e5c7", "#ff2bd6"] }
] as const;

type ThemePreference = (typeof themes)[number]["id"];

const validThemes = new Set<ThemePreference>(themes.map((theme) => theme.id));
const darkThemes = new Set(["dark", "midnight", "graphite", "coffee", "cyber"]);

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = darkThemes.has(resolved) ? "dark" : "light";
}

export default function ThemeSwitcher() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [preference, setPreference] = useState<ThemePreference>("itts");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const initial = stored && validThemes.has(stored) ? stored : "itts";
    setPreference(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) || "itts") as ThemePreference;
      if (current === "system") applyTheme("system");
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next =
        event.newValue && validThemes.has(event.newValue as ThemePreference)
          ? (event.newValue as ThemePreference)
          : "itts";
      setPreference(next);
      applyTheme(next);
    };

    media.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function chooseTheme(theme: ThemePreference) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setPreference(theme);
    applyTheme(theme);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const selected = themes.find((theme) => theme.id === preference) ?? themes[1];

  return (
    <details ref={detailsRef} className={styles.switcher}>
      <summary className={styles.trigger} aria-label={"Pilih tema. Tema aktif: " + selected.label}>
        <span className={styles.triggerSwatch} aria-hidden="true" />
        <span className={styles.triggerCopy}>
          <small>Tema</small>
          <strong>{selected.label}</strong>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌃</span>
      </summary>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <strong>Pilih tema sistem</strong>
            <span>Preferensi tersimpan otomatis di perangkat ini.</span>
          </div>
          <span className={styles.count}>{themes.length} tema</span>
        </div>

        <div className={styles.grid}>
          {themes.map((theme) => {
            const active = theme.id === preference;
            return (
              <button
                key={theme.id}
                type="button"
                className={styles.themeCard}
                data-active={active ? "true" : "false"}
                aria-pressed={active}
                onClick={() => chooseTheme(theme.id)}
              >
                <span className={styles.palette} aria-hidden="true">
                  {theme.swatches.map((swatch) => (
                    <i key={swatch} style={{ background: swatch }} />
                  ))}
                </span>
                <span className={styles.themeCopy}>
                  <strong>{theme.label}</strong>
                  <small>{theme.note}</small>
                </span>
                <span className={styles.check} aria-hidden="true">{active ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>

        <p className={styles.hint}>
          Tema <strong>Sistem</strong> otomatis mengikuti mode terang/gelap perangkat.
        </p>
      </div>
    </details>
  );
}
