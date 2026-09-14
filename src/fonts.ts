import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";

/**
 * Typefaces bundled in assets/fonts/ (Google Fonts, OFL). Each one ships a
 * regular and a bold cut; the renderer registers them with the canvas and
 * the studio declares matching @font-face rules, so a bundled font looks
 * the same in the browser and in the exported PNGs. `theme.fontFamily` stays
 * a plain CSS string: system fonts keep working, and `fontStack()` builds the
 * value for a bundled one.
 */
export type BundledFont = {
  /** CSS family name, as registered with the canvas and declared in @font-face. */
  family: string;
  /** Generic fallbacks appended after the family. */
  fallback: string;
  /** Font files under assets/fonts/, keyed by weight. */
  files: Record<number, string>;
};

export const FONTS = {
  merriweather: {
    family: "Merriweather",
    fallback: "Georgia, serif",
    files: { 400: "Merriweather-400.ttf", 700: "Merriweather-700.ttf" },
  },
  newsreader: {
    family: "Newsreader",
    fallback: "Georgia, serif",
    // Ships one cut: the 16pt optical size's Medium, the exact binary Mukaase
    // renders its own recipe titles from. No 400 or 700 cut exists — do not
    // add one from elsewhere, it would stop matching the app.
    files: { 500: "Newsreader16pt-Medium.ttf" },
  },
  "dm-mono": {
    family: "DM Mono",
    fallback: "ui-monospace, Menlo, monospace",
    // DM Mono ships no bold; its heaviest cut is 500.
    files: { 400: "DMMono-400.ttf", 500: "DMMono-500.ttf" },
  },
  lato: {
    family: "Lato",
    fallback: "system-ui, sans-serif",
    files: { 400: "Lato-400.ttf", 700: "Lato-700.ttf" },
  },
  "dm-sans": {
    family: "DM Sans",
    fallback: "system-ui, sans-serif",
    files: { 400: "DMSans-400.ttf", 700: "DMSans-700.ttf" },
  },
  montserrat: {
    family: "Montserrat",
    fallback: "system-ui, sans-serif",
    files: { 400: "Montserrat-400.ttf", 700: "Montserrat-700.ttf" },
  },
} as const satisfies Record<string, BundledFont>;

export type FontKey = keyof typeof FONTS;
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];

/** The system font: what the example config uses and what `--font system` restores. */
export const SYSTEM_FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';

const FONTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");

export function fontFilePath(file: string): string {
  return resolve(FONTS_DIR, file);
}

/** The `theme.fontFamily` value for a bundled font, or the system stack for "system". */
export function fontStack(key: string): string {
  if (key === "system") return SYSTEM_FONT;
  const font = (FONTS as Record<string, BundledFont>)[key];
  if (!font) {
    throw new Error(`Unknown font "${key}". Available: system, ${FONT_KEYS.join(", ")}`);
  }
  return `"${font.family}", ${font.fallback}`;
}

/** The first family name in a CSS font-family stack, unquoted. */
function firstFamily(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

/**
 * Caps a requested font-weight at the heaviest cut a bundled font actually
 * ships. Canvas synthesises a fake bold for a weight no registered face
 * matches — visibly thicker, distorted strokes, not the typeface's own
 * design — so a single-cut font (Newsreader ships only its 500 Medium) must
 * never be asked for 700. Unrecognised or multi-cut families (a system
 * stack, or a bundled font whose heaviest cut already covers the request)
 * pass the requested weight through unchanged.
 */
export function clampWeight(fontFamily: string, weight: number): number {
  const family = firstFamily(fontFamily);
  const font = Object.values(FONTS as Record<string, BundledFont>).find(
    (candidate) => candidate.family === family,
  );
  if (!font) return weight;
  const available = Object.keys(font.files).map(Number);
  const max = Math.max(...available);
  return Math.min(weight, max);
}

let registered = false;

/** Makes every bundled font available to the canvas. Safe to call repeatedly. */
export function registerFonts() {
  if (registered) return;
  registered = true;
  for (const font of Object.values(FONTS)) {
    for (const file of Object.values(font.files)) {
      GlobalFonts.registerFromPath(fontFilePath(file), font.family);
    }
  }
}
