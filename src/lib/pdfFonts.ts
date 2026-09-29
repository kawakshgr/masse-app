import path from "node:path";
import { Font } from "@react-pdf/renderer";

/* The same two families as the screen. fontkit reads .woff directly, so the
   files are vendored from @fontsource under assets/fonts (SIL OFL 1.1, licence
   text beside them) rather than fetched at render time — and rather than read
   out of node_modules, which a deployed bundle does not promise to keep.
   next.config.ts traces this folder into the function. */
const fontFile = (file: string) =>
  path.join(process.cwd(), "assets", "fonts", file);

let registered = false;
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Instrument Sans",
    fonts: [
      { src: fontFile("instrument-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: fontFile("instrument-sans-latin-600-normal.woff"), fontWeight: 600 },
      { src: fontFile("instrument-sans-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Bricolage",
    fonts: [
      { src: fontFile("bricolage-grotesque-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  // A French invoice has long unbroken strings — IBAN, SIRET. Let them wrap
  // rather than run off the sheet.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
