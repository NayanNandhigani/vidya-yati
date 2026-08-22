import type { Config } from "tailwindcss";

// Colors mirror the CSS custom properties in app/globals.css exactly — the
// hex values below are the same tokens used throughout the design canvas
// and the clickable prototype (see design-reference/). Keep the two in
// sync: if a token changes here, change it in globals.css too, and vice
// versa. Tailwind utility classes (bg-ink, text-marigold, etc.) resolve to
// the CSS variables so a runtime theme swap still works if ever needed.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        sidebar: "var(--sidebar)",
        paper: "var(--paper)",
        card: "var(--card)",
        line: "var(--line)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        marigold: {
          DEFAULT: "var(--marigold)",
          deep: "var(--marigold-deep)",
          tint: "var(--marigold-tint)",
        },
        teal: {
          DEFAULT: "var(--teal)",
          tint: "var(--teal-tint)",
        },
        clay: {
          DEFAULT: "var(--clay)",
          tint: "var(--clay-tint)",
        },
        good: {
          DEFAULT: "var(--good)",
          tint: "var(--good-tint)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          tint: "var(--warn-tint)",
        },
        info: {
          DEFAULT: "var(--info)",
          tint: "var(--info-tint)",
        },
        critical: {
          DEFAULT: "var(--critical)",
          tint: "var(--critical-tint)",
          border: "var(--critical-border)",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
